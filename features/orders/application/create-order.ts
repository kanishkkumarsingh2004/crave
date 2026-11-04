/**
 * Application use case: Create a new order.
 * Pure business orchestration — no HTTP response handling.
 * The HTTP adapter (route) is responsible for NextResponse, rate-limit headers,
 * and idempotency header parsing.
 */

import { prisma } from '@/lib/infra/prisma'
import crypto from 'crypto'
import { findRestaurantById } from '@/lib/dal/restaurants'
import { findMenuItemById, findMenuItemsByIds } from '@/lib/dal/menu-items'
import { validateAndApplyCoupon } from '@/lib/dal/coupons'
import { getActivePaymentConfig } from '@/lib/dal/payments'
import { DEFAULT_PAYMENT_CONFIG, type PaymentConfig } from '@/lib/payment-config'
import {
  calculateOrderPrice,
  tolegacyCalculatorResult,
  type OrderPriceInput,
} from '@/lib/finance/pricing-engine'
import type { PriceTaxMode } from '@/lib/finance/tax-engine'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import {
  acquireIdempotency,
  releaseIdempotency,
  completeIdempotency,
  hashPayload,
} from '@/lib/idempotency'
import { getMenuItemAvailability } from '@/lib/menu-availability'
import { toMenuItemRealtimeEvent } from '@/lib/menu-item-visibility'
import { calculateMenuAppPrice } from '@/lib/menu-pricing'
import { CRAVEXP_DARK_STORE_ID } from '@/lib/cravexp-grocery-catalog'
import { invalidateOrdersCache } from '@/lib/dal/orders'
import { cacheDel, CacheKeys } from '@/lib/infra/cache'
import { broadcast } from '@/lib/ws-server'
import { sendWebPushToRoles, sendWebPushToUsers, type WebPushPayload } from '@/lib/web-push'
import { sendDriverPushToUsers, sendNativePushToUsers } from '@/lib/notifications/driver-push'
import { stripOrderSecrets } from '@/lib/auth/order-access'
import { OrderStatus } from '@prisma/client'
import type { OrderActor, CreateOrderResult, OrderPriceBreakdown } from '../domain/order.types'

export interface CreateOrderInput {
  actor: OrderActor
  body: Record<string, unknown>
  idempotencyKey: string | null
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { actor, body, idempotencyKey } = input

  const {
    customer_name,
    customer_phone,
    restaurant_id,
    restaurant_name,
    items,
    payment_method = 'UPI Online',
    utr_ref,
    customer_vpa,
    tip = 0,
    coupon_code,
    order_type = 'restaurant_food',
  } = body

  const isCraveXPOrder = order_type === 'cravexp_grocery' || restaurant_id === CRAVEXP_DARK_STORE_ID
  const resolvedOrderType = isCraveXPOrder ? 'cravexp_grocery' : 'restaurant_food'

  // Derive customer_id from authenticated session only
  const finalCustomerId = actor.id
  const orderId = (body.id as string | undefined) || crypto.randomUUID()
  const paymentConfig = await getActiveConfig()
  const isCustomerActor = actor.role === 'user' || (actor.role as string) === 'customer'
  const paymentMethodLower = String(payment_method || 'UPI Online').toLowerCase()

  const isRazorpayFlow =
    paymentMethodLower.includes('razorpay') ||
    Boolean((paymentConfig as any).razorpayEnabled || (paymentConfig as any).razorpay_enabled)

  if (isCustomerActor && !paymentMethodLower.includes('upi') && !isRazorpayFlow) {
    return {
      success: false,
      error: 'Customer checkout supports UPI Online or Razorpay payments only.',
      statusCode: 400,
    }
  }

  if (
    isCustomerActor &&
    !isRazorpayFlow &&
    paymentMethodLower.includes('upi') &&
    (!utr_ref || !/^\d{10,18}$/.test(String(utr_ref).trim()))
  ) {
    return {
      success: false,
      error: 'Enter a valid 10–18 digit UPI transaction reference (UTR).',
      statusCode: 400,
    }
  }

  // Idempotency
  let idempotencyFencingToken: string | undefined
  const idempotencyRequestHash = idempotencyKey ? hashPayload(body) : ''
  let idempotencyAcquired = false
  if (idempotencyKey) {
    const idemCheck = await acquireIdempotency(idempotencyKey, 'order_checkout', body)
    idempotencyFencingToken = idemCheck.fencingToken
    idempotencyAcquired = true
    if (idemCheck.status === 'completed') {
      return {
        success: true,
        order: idemCheck.body,
        orderId: idemCheck.body?.orderId || orderId,
        statusCode: idemCheck.statusCode || 200,
      }
    }
    if (idemCheck.status === 'conflict') {
      return {
        success: false,
        error:
          'Idempotency key reused with a different payload. Do not reuse idempotency keys for different requests.',
        statusCode: 422,
      }
    }
    if (idemCheck.status === 'processing') {
      return {
        success: false,
        error:
          'An order checkout with this idempotency key is already in progress. Please retry shortly.',
        statusCode: 409,
      }
    }
  }

  // Helper to release idempotency lease on early exit
  const releaseLease = async () => {
    if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
      await releaseIdempotency(idempotencyKey, 'order_checkout', idempotencyFencingToken)
      idempotencyAcquired = false
    }
  }

  // Ensure lease is released on any early return or error
  try {

  // Check existing order by ID
  if (body.id && typeof prisma?.order?.findUnique === 'function') {
    try {
      const existingOrderById = await prisma.order.findUnique({
        where: { id: body.id as string },
      })
      if (existingOrderById) {
        if (existingOrderById.customer_id !== finalCustomerId) {
          await releaseLease()
          return { success: false, error: 'Order not found', statusCode: 404 }
        }
        if (!['delivered', 'completed', 'cancelled'].includes(existingOrderById.status)) {
          if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
            await completeIdempotency(
              idempotencyKey,
              'order_checkout',
              200,
              { success: true, order: existingOrderById, orderId: existingOrderById.id, message: 'Order already processed (idempotent)' },
              idempotencyFencingToken,
              idempotencyRequestHash
            )
            idempotencyAcquired = false
          }
          return {
            success: true,
            order: existingOrderById,
            orderId: existingOrderById.id,
            message: 'Order already processed (idempotent)',
          }
        }
      }
    } catch (e) {
      console.error('[createOrder] Failed to check existing order by ID:', e)
    }
  }

  // Check existing order by idempotency key
  if (idempotencyKey && typeof prisma?.order?.findFirst === 'function') {
    try {
      const existingByIdempotency = await prisma.order.findFirst({
        where: {
          customer_id: finalCustomerId,
          idempotency_key: idempotencyKey,
          status: { notIn: ['delivered', 'completed', 'cancelled'] },
        } as any,
      })
      if (existingByIdempotency) {
        if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
          await completeIdempotency(
            idempotencyKey,
            'order_checkout',
            200,
            { success: true, order: existingByIdempotency, orderId: existingByIdempotency.id, message: 'Order already processed (idempotent)' },
            idempotencyFencingToken,
            idempotencyRequestHash
          )
          idempotencyAcquired = false
        }
        return {
          success: true,
          order: existingByIdempotency,
          orderId: existingByIdempotency.id,
          message: 'Order already processed (idempotent)',
        }
      }
    } catch (e) {
      console.error('[createOrder] Failed to check existing order by idempotency key:', e)
    }
  }

  // UTR deduplication
  if (utr_ref && typeof prisma?.order?.findFirst === 'function') {
    try {
      const cleanUtr = String(utr_ref).trim()
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
      const existingOrderWithUtr = await prisma.order.findFirst({
        where: {
          utr_ref: cleanUtr,
          customer_id: finalCustomerId,
          status: { notIn: ['delivered', 'completed', 'cancelled'] },
          created_at: { gte: fifteenMinutesAgo },
        },
        orderBy: { created_at: 'desc' },
      })
      if (existingOrderWithUtr) {
        if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
          await completeIdempotency(
            idempotencyKey,
            'order_checkout',
            200,
            { success: true, order: existingOrderWithUtr, orderId: existingOrderWithUtr.id, message: 'Order already received and processing (deduplicated)' },
            idempotencyFencingToken,
            idempotencyRequestHash
          )
          idempotencyAcquired = false
        }
        return {
          success: true,
          order: existingOrderWithUtr,
          orderId: existingOrderWithUtr.id,
          message: 'Order already received and processing (deduplicated)',
        }
      }
    } catch (e) {
      console.error('[createOrder] Failed to check UTR deduplication:', e)
    }
  }

  // Resolve restaurant
  let restaurant: any = null
  if (restaurant_id && typeof findRestaurantById === 'function') {
    try {
      restaurant = await findRestaurantById(restaurant_id as string)
    } catch (e) {
      restaurant = null
    }
    if (!restaurant) {
      await releaseLease()
      return {
        success: false,
        error: `Restaurant not found: ${restaurant_id}`,
        statusCode: 404,
      }
    }
  }

  // Validate items from trusted database prices
  const rawItems: any[] = Array.isArray(items)
    ? items
    : typeof items === 'string'
      ? (() => {
          try {
            return JSON.parse(items)
          } catch {
            return []
          }
        })()
      : []

  if (rawItems.length === 0) {
    await releaseLease()
    return { success: false, error: 'At least one item is required', statusCode: 400 }
  }

  type RawItemEntry = { itemId: string; variantId?: string; quantity: number; raw: any }
  const validatedRaw: RawItemEntry[] = []

  for (const rawItem of rawItems) {
    const itemRecord = rawItem as Record<string, unknown>
    const itemId =
      (itemRecord.menuItemId as string | undefined) ||
      (itemRecord.menu_item_id as string | undefined) ||
      (itemRecord.itemId as string | undefined) ||
      (itemRecord.id as string | undefined)
    const variantId =
      (itemRecord.variantId as string | undefined) || (itemRecord.variant_id as string | undefined)
    const rawQuantity = itemRecord.quantity || itemRecord.qty || 1

    if (!itemId) {
      await releaseLease()
      return {
        success: false,
        error: 'Each item must have an itemId/menuItemId',
        statusCode: 400,
      }
    }

    const quantity = Math.floor(Number(rawQuantity))
    if (!Number.isInteger(quantity) || quantity < 1) {
      await releaseLease()
      return {
        success: false,
        error: `Quantity must be a positive integer for item ${itemId}`,
        statusCode: 400,
      }
    }
    if (quantity > 100) {
      await releaseLease()
      return {
        success: false,
        error: `Quantity exceeds maximum allowed (100) for item ${itemId}`,
        statusCode: 400,
      }
    }

    validatedRaw.push({ itemId, variantId, quantity, raw: rawItem })
  }

  // Fetch from catalog
  const allItemIds = validatedRaw.map((r) => r.itemId)
  let menuItemMap = new Map<string, any>()
  if (isCraveXPOrder) {
    try {
      const products = await prisma.craveXPProduct.findMany({
        where: { id: { in: allItemIds } },
      })
      menuItemMap = new Map(
        products.map((product) => [
          product.id,
          { ...product, restaurant_id: CRAVEXP_DARK_STORE_ID },
        ])
      )
    } catch (e) {
      menuItemMap = new Map()
    }
  } else {
    if (typeof findMenuItemsByIds === 'function') {
      try {
        menuItemMap = await findMenuItemsByIds(allItemIds)
      } catch (e) {
        menuItemMap = new Map()
      }
    }
    if ((!menuItemMap || menuItemMap.size === 0) && typeof findMenuItemById === 'function') {
      menuItemMap = new Map()
      for (const id of allItemIds) {
        try {
          const item = await findMenuItemById(id)
          if (item) menuItemMap.set(id, item)
        } catch (e) {
          console.error(`[createOrder] Failed to fetch menu item ${id}:`, e)
        }
      }
    }
  }

  // Validate existence, restaurant ownership, stock, build itemsList
  const itemsList: any[] = []
  let foodSubtotal = 0

  for (const { itemId, variantId, quantity } of validatedRaw) {
    let menuItem = menuItemMap.get(itemId)
    if (!menuItem) {
      await releaseLease()
      return {
        success: false,
        error: `${isCraveXPOrder ? 'XP product' : 'Menu item'} not found: ${itemId}`,
        statusCode: 404,
      }
    }

    if (restaurant && menuItem.restaurant_id !== restaurant.id) {
      await releaseLease()
      return {
        success: false,
        error: `Item ${itemId} not available at this restaurant`,
        statusCode: 400,
      }
    }

    const hasTrackedStock = typeof menuItem.stock_count === 'number'
    const hasInsufficientStock = hasTrackedStock && menuItem.stock_count < quantity
    if (
      isCraveXPOrder &&
      (menuItem.in_stock === false || !hasTrackedStock || hasInsufficientStock)
    ) {
      if (idempotencyKey) {
        await releaseIdempotency(idempotencyKey, 'order_checkout', idempotencyFencingToken)
      }
      return {
        success: false,
        error: `Item ${menuItem.name} is out of stock`,
        statusCode: 400,
      }
    }

    const variants = Array.isArray(menuItem.variants) ? menuItem.variants : []
    const selectedVariant =
      variants.length > 0
        ? variantId
          ? variants.find((variant: any) => variant.id === variantId)
          : variants.find((variant: any) => variant.is_default && variant.in_stock !== false) ||
            variants.find((variant: any) => variant.in_stock !== false)
        : null
    if (variants.length > 0 && !selectedVariant) {
      await releaseLease()
      return {
        success: false,
        error: {
          code: 'ITEM_UNAVAILABLE',
          error: `Selected size is not available for ${menuItem.name}`,
        },
        statusCode: 400,
      }
    }
    if (selectedVariant?.in_stock === false) {
      await releaseLease()
      return {
        success: false,
        error: `${menuItem.name} (${selectedVariant.name}) is out of stock`,
        statusCode: 400,
      }
    }
    if (
      !isCraveXPOrder &&
      (!getMenuItemAvailability(menuItem, selectedVariant?.id).isOrderable || hasInsufficientStock)
    ) {
      await releaseLease()
      return {
        success: false,
        error: {
          code: hasInsufficientStock ? 'INSUFFICIENT_STOCK' : 'ITEM_UNAVAILABLE',
          error: `Item ${menuItem.name} is out of stock`,
        },
        statusCode: 400,
      }
    }

    const restaurantPrice = Number(
      selectedVariant?.restaurant_price ??
        menuItem.restaurant_price ??
        selectedVariant?.price ??
        menuItem.price ??
        0
    )
    const contract = restaurant?.commercial_contracts?.[0]
    const price = isCraveXPOrder
      ? Number(selectedVariant?.price ?? menuItem.price ?? 0)
      : calculateMenuAppPrice(restaurantPrice, {
          commercialModel: contract?.commercial_model ?? restaurant?.commercial_model,
          commissionRate: contract?.commission_rate ?? restaurant?.commission_rate,
          markupRate: contract?.markup_rate ?? restaurant?.markup_rate,
          fixedCommission: contract?.fixed_commission ?? restaurant?.fixed_commission,
          fixedMarkup: contract?.fixed_markup ?? restaurant?.fixed_markup,
        })
    const hasExplicitRestaurantPrice = selectedVariant != null || menuItem.restaurant_price != null
    if (
      !Number.isFinite(price) ||
      !Number.isFinite(restaurantPrice) ||
      price < 0 ||
      restaurantPrice < 0 ||
      price < restaurantPrice
    ) {
      await releaseLease()
      return {
        success: false,
        error: `Invalid pricing configuration for ${menuItem.name}`,
        statusCode: 500,
      }
    }
    const lineTotal = price * quantity
    foodSubtotal += lineTotal

    // Derive tax rate from item category only — client taxRate is ignored
    const itemCategory = (menuItem.category || '').toLowerCase()
    const isBeverage = itemCategory.includes('beverage') || itemCategory.includes('drink')
    const isAlcohol = itemCategory.includes('alcohol') || itemCategory.includes('liquor')
    const isPackaged = itemCategory.includes('packaged') || itemCategory.includes('grocery')

    let taxRate = paymentConfig.gstRatePercent ?? 5
    if (isAlcohol) taxRate = 28
    else if (isPackaged) taxRate = 18
    else if (isBeverage) taxRate = 12

    const priceTaxMode = (menuItem.price_tax_mode || 'TAX_INCLUSIVE') as PriceTaxMode

    itemsList.push({
      id: itemId,
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.name || null,
      name: menuItem.name,
      quantity,
      price,
      restaurantPrice,
      hasExplicitRestaurantPrice,
      platformProductMargin: (price - restaurantPrice) * quantity,
      lineTotal,
      taxRate,
      priceTaxMode,
      _menuItem: menuItem,
    })
  }

  // Determine final restaurant ID
  let finalRestaurantId = restaurant?.id
  if (!finalRestaurantId) {
    const restaurantIds = new Set(itemsList.map((i) => i._menuItem.restaurant_id).filter(Boolean))
    if (restaurantIds.size !== 1) {
      await releaseLease()
      return {
        success: false,
        error: 'All items must belong to the same restaurant',
        statusCode: 400,
      }
    }
    finalRestaurantId = restaurantIds.values().next().value
  }

  // Validate restaurant exists
  let restaurantDetails = restaurant
  if (!restaurantDetails && finalRestaurantId) {
    try {
      restaurantDetails = await findRestaurantById(finalRestaurantId)
    } catch (e) {
      restaurantDetails = null
    }
  }
  if (!restaurantDetails) {
    if (process.env.NODE_ENV !== 'production') {
      restaurantDetails = {
        id: finalRestaurantId || 'rest_spice_garden',
        name: restaurant_name || 'Spice Garden',
        cuisine: 'North Indian & Mughlai',
        commercial_model: 'commission',
        commission_rate: 15,
        markup_rate: 0,
        fixed_commission: 0,
        fixed_markup: 0,
        price_tax_mode: 'TAX_INCLUSIVE',
        gst_status: 'REGISTERED',
        supplier_state: 'Karnataka',
        latitude: 12.686,
        longitude: 77.475,
      }
    } else {
      await releaseLease()
      return {
        success: false,
        error: 'Restaurant not found or unavailable',
        statusCode: 404,
      }
    }
  }

  const finalRestaurantName = (restaurant_name as string) || restaurantDetails.name

  // Clean itemsList for storage
  const itemsForStorage: any[] = itemsList.map(({ _menuItem, ...item }) => item)

  // Validate coupon
  let couponDiscountAmount = 0
  let couponResult: any = null
  if (coupon_code) {
    couponResult = await validateAndApplyCoupon(
      coupon_code as string,
      foodSubtotal,
      finalRestaurantId
    )
    if (!couponResult.valid) {
      await releaseLease()
      return {
        success: false,
        error: couponResult.error || 'Invalid coupon',
        statusCode: 400,
      }
    }
    couponDiscountAmount = couponResult.discount
  }

  const commercialModel = (restaurantDetails?.commercial_model || 'commission') as
    'commission' | 'markup' | 'hybrid'

  // Resolve canonical address from authenticated customer's saved records
  let customerLat: number | null = null
  let customerLng: number | null = null
  let canonicalAddressText: string = ''
  let customerAddressState: string | null = null

  const targetAddressId = (body.address_id as string) || (body.addressId as string) || null

  if (targetAddressId) {
    if (typeof prisma?.customerAddress?.findFirst !== 'function') {
      await releaseLease()
      return {
        success: false,
        error: 'Address lookup unavailable. Please try again.',
        statusCode: 503,
      }
    }

    const requestedAddress = await prisma.customerAddress.findFirst({
      where: { id: targetAddressId, customer_id: finalCustomerId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        address: true,
        label: true,
      },
    })

    if (!requestedAddress) {
      await releaseLease()
      return {
        success: false,
        error: 'Selected delivery address not found. Please choose a valid address.',
        statusCode: 400,
      }
    }

    let addrLat = requestedAddress.latitude != null ? Number(requestedAddress.latitude) : null
    let addrLng = requestedAddress.longitude != null ? Number(requestedAddress.longitude) : null
    if (
      addrLat === null ||
      addrLng === null ||
      !Number.isFinite(addrLat) ||
      !Number.isFinite(addrLng)
    ) {
      await releaseLease()
      return {
        success: false,
        error:
          'Selected delivery address is missing coordinates. Please choose a different address or update your saved address.',
        statusCode: 400,
      }
    }

    customerLat = addrLat
    customerLng = addrLng
    customerAddressState = 'Karnataka'

    canonicalAddressText =
      requestedAddress.address ||
      ((typeof body.customer_address === 'string' && body.customer_address.trim()
        ? body.customer_address.trim()
        : '') as string) ||
      requestedAddress.label ||
      'Customer address'
  } else {
    let matchedAddress: any = null

    if (typeof prisma?.customerAddress?.findFirst === 'function') {
      try {
        matchedAddress = await prisma.customerAddress.findFirst({
          where: { customer_id: finalCustomerId, is_default: true },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            address: true,
            label: true,
          },
        })

        if (!matchedAddress) {
          matchedAddress = await prisma.customerAddress.findFirst({
            where: { customer_id: finalCustomerId },
            select: {
              id: true,
              latitude: true,
              longitude: true,
              address: true,
              label: true,
            },
          })
        }
      } catch (addrErr) {
        matchedAddress = null
      }
    }

    if (matchedAddress) {
      const addrLat = matchedAddress.latitude != null ? Number(matchedAddress.latitude) : null
      const addrLng = matchedAddress.longitude != null ? Number(matchedAddress.longitude) : null
      if (
        addrLat !== null &&
        addrLng !== null &&
        Number.isFinite(addrLat) &&
        Number.isFinite(addrLng)
      ) {
        customerLat = addrLat
        customerLng = addrLng
      }
      customerAddressState = 'Karnataka'
      canonicalAddressText =
        matchedAddress.address ||
        ((typeof body.customer_address === 'string' && body.customer_address.trim()
          ? body.customer_address.trim()
          : '') as string) ||
        matchedAddress.label ||
        ''
    } else if (
      body.customer_address &&
      typeof body.customer_address === 'string' &&
      body.customer_address.trim()
    ) {
      await releaseLease()
      return {
        success: false,
        error:
          'No saved delivery address found. Please add a delivery address from your account before ordering.',
        statusCode: 400,
      }
    }

    if (customerLat === null || customerLng === null) {
      await releaseLease()
      return {
        success: false,
        error:
          'Delivery address is missing coordinates. Please update your saved address or add a new one.',
        statusCode: 400,
      }
    }
  }

  if (!canonicalAddressText) {
    canonicalAddressText = 'Customer address'
  }

  // Restaurant coordinates
  const restaurantLat = restaurantDetails?.latitude ? Number(restaurantDetails.latitude) : null
  const restaurantLng = restaurantDetails?.longitude ? Number(restaurantDetails.longitude) : null

  const serverCalculatedDistanceKm = calculateRoadTravelDistanceKm(
    restaurantLat,
    restaurantLng,
    customerLat,
    customerLng
  )

  // Pricing engine
  const pricingInput: OrderPriceInput = {
    orderId,
    orderType: resolvedOrderType,
    restaurantId: finalRestaurantId,
    restaurantName: finalRestaurantName,
    supplierState: restaurantDetails.supplier_state || 'Karnataka',
    customerState: customerAddressState || restaurantDetails.supplier_state || 'Karnataka',
    items: itemsList.map((i) => ({
      name: i.name,
      hsnSacCode: i._menuItem?.hsn_sac_code || '996331',
      quantity: i.quantity,
      unitPricePaise: Math.round(i.price * 100),
      restaurantUnitPricePaise: i.hasExplicitRestaurantPrice
        ? Math.round(i.restaurantPrice * 100)
        : undefined,
      priceTaxMode: i.priceTaxMode,
      taxCategory:
        resolvedOrderType === 'cravexp_grocery'
          ? i.taxRate === 18
            ? ('GROCERY_18PCT' as const)
            : i.taxRate === 12
              ? ('GROCERY_12PCT' as const)
              : ('GROCERY_5PCT' as const)
          : ('RESTAURANT_SERVICE' as const),
      taxRatePercent: i.taxRate,
      customCommissionRatePercent: i._menuItem?.custom_commission_rate
        ? Number(i._menuItem.custom_commission_rate)
        : undefined,
      customMarkupRatePercent: i._menuItem?.custom_markup_rate
        ? Number(i._menuItem.custom_markup_rate)
        : undefined,
    })),
    delivery: {
      baseDeliveryFeePaise: Math.round((paymentConfig.baseDeliveryFee ?? 30) * 100),
      baseDistanceKm: paymentConfig.baseDistanceKm ?? 2.5,
      perKmRatePaise: Math.round((paymentConfig.perKmRate ?? 10) * 100),
      freeDeliveryThresholdPaise: Math.round((paymentConfig.freeDeliveryThreshold ?? 500) * 100),
      roadDistanceKm: serverCalculatedDistanceKm,
    },
    surcharges: {
      surgeMultiplier: paymentConfig.surgeMultiplier ?? 1.0,
      rainFeePaise: Math.round((paymentConfig.rainFee ?? 0) * 100),
      nightSurgeFeePaise: Math.round((paymentConfig.nightSurgeFee ?? 0) * 100),
      isRainActive: paymentConfig.isRainModeActive ?? false,
      isNightSurgeActive: paymentConfig.isNightSurgeActive ?? false,
    },
    platformFeePaise: Math.round((paymentConfig.platformFee ?? 6) * 100),
    handlingFeePaise: Math.round((paymentConfig.handlingFee ?? 5) * 100),
    packagingFeePaise: Math.round((paymentConfig.packagingCap ?? 20) * 100),
    smallCartFeePaise: 0,
    smallCartThresholdPaise: 0,
    couponDiscountPaise: Math.round(couponDiscountAmount * 100),
    couponFundingSource:
      couponResult?.coupon?.funding_source === 'RESTAURANT' ||
      couponResult?.coupon?.funding_source === 'PLATFORM' ||
      couponResult?.coupon?.funding_source === 'BANK'
        ? couponResult.coupon.funding_source
        : 'SHARED',
    restaurantDiscountSharePercent: Number(couponResult?.coupon?.restaurant_share ?? 50),
    tipPaise: Math.round(((tip as number) || 0) * 100),
    contract: {
      contractNumber: restaurantDetails.contract_number || 'DEFAULT',
      version: 1,
      commercialModel,
      commissionRatePercent: Number(
        restaurantDetails.commission_rate ?? paymentConfig.vendorCommission ?? 15
      ),
      markupRatePercent: Number(restaurantDetails.markup_rate || 0),
      fixedCommissionPaise: Math.round((restaurantDetails.fixed_commission || 0) * 100),
      fixedMarkupPaise: Math.round((restaurantDetails.fixed_markup || 0) * 100),
      commissionBasis: 'ORDER_SUBTOTAL',
      priceTaxMode: restaurantDetails.price_tax_mode || 'TAX_INCLUSIVE',
      gstStatus: restaurantDetails.gst_status || 'REGISTERED',
      supplierState: restaurantDetails.supplier_state || 'Karnataka',
      restaurantGstin: restaurantDetails.gstin || '',
    },
  }

  const canonicalResult = calculateOrderPrice(pricingInput)
  const calcResult = tolegacyCalculatorResult(canonicalResult)

  const vendorNetPayout = Math.round(canonicalResult.vendorPayableNetPaise / 100)
  const driverPayout = Math.round(canonicalResult.riderPayablePaise / 100)
  const platformProfit = Math.round(canonicalResult.platformNetRevenuePaise / 100)
  const capPackaging = calcResult.customerBilling.packagingFee

  const billingBreakdown: OrderPriceBreakdown = {
    subtotal: foodSubtotal,
    commercial_model: commercialModel,
    markup_rate: Number(restaurantDetails.markup_rate || 0),
    markup_amount: Math.round(canonicalResult.markupAmountPaise / 100),
    product_margin: Math.round(canonicalResult.platformProductMarginPaise / 100),
    restaurant_base_subtotal: Math.round(canonicalResult.restaurantBaseSubtotalPaise / 100),
    packaging_fee: capPackaging,
    delivery_fee: calcResult.customerBilling.netDeliveryFee,
    platform_fee: calcResult.customerBilling.platformFee,
    handling_fee: calcResult.customerBilling.handlingFee,
    gst: calcResult.customerBilling.gstAmount,
    gst_rate_percent: (() => {
      const itemRate = itemsList.find((i: any) => i.taxRate != null)?.taxRate
      if (itemRate != null) return Number(itemRate)
      return paymentConfig.gstRatePercent ?? 5
    })(),
    tip: calcResult.customerBilling.tip,
    discount_amount: calcResult.customerBilling.couponDiscount,
    total_amount: calcResult.customerBilling.grandTotal,
    vendor_commission_rate: Number(
      restaurantDetails.commission_rate || paymentConfig.vendorCommission || 15
    ),
    vendor_commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
    vendor_net_payout: vendorNetPayout,
    driver_payout: driverPayout,
    driver_base_payout: calcResult.driverEarnings.baseDistanceShare,
    driver_extra_distance_payout: calcResult.driverEarnings.extraDistanceShare,
    driver_surge_payout: calcResult.driverEarnings.surgeRainShare,
    driver_payout_share: paymentConfig.driverPayoutShare,
    platform_net_profit: platformProfit,
  }

  if (itemsForStorage.length > 0) {
    itemsForStorage[0].billing_breakdown = billingBreakdown
  } else {
    itemsForStorage.push({
      id: 'meta',
      name: 'Order Metadata',
      qty: 1,
      price: 0,
      billing_breakdown: billingBreakdown,
    })
  }

  // Generate OTP server-side
  const deliveryOtp = String(crypto.randomInt(100000, 999999))
  const initialStatus: OrderStatus = utr_ref ? 'payment_submitted' : 'payment_pending'

  // Atomic transaction
  let order: any
  let inventoryCommitted = false
  try {
    order = await prisma.$transaction(async (tx: any) => {
      // 1. Atomic inventory decrement
      for (const { itemId, quantity } of validatedRaw) {
        const item = menuItemMap.get(itemId)
        if (item && typeof item.stock_count === 'number') {
          const inventory = isCraveXPOrder ? tx.craveXPProduct : tx.menuItem
          const updated = await inventory.updateMany({
            where: {
              id: itemId,
              in_stock: true,
              stock_count: { gte: quantity },
            },
            data: {
              stock_count: { decrement: quantity },
            },
          })
          if (updated.count === 0) {
            throw new Error(`INSUFFICIENT_STOCK:${item.name || itemId}`)
          }
          await inventory.updateMany({
            where: { id: itemId, stock_count: 0 },
            data: { in_stock: false },
          })
        }
      }

      // 2. Server-authoritative initial status
      const initialStatusTx: OrderStatus = utr_ref ? 'payment_submitted' : 'payment_pending'

      const customerRecord = finalCustomerId
        ? await tx.user
            .findUnique({ where: { id: finalCustomerId }, select: { id: true } })
            .catch(() => null)
        : null
      const restaurantRecord = finalRestaurantId
        ? await tx.restaurant
            .findUnique({ where: { id: finalRestaurantId }, select: { id: true } })
            .catch(() => null)
        : null

      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          customer: customerRecord ? { connect: { id: customerRecord.id } } : undefined,
          customer_name: (customer_name as string) || (actor as any)?.name || 'Customer',
          customer_phone: (customer_phone as string) || undefined,
          customer_address: canonicalAddressText,
          restaurant: restaurantRecord ? { connect: { id: restaurantRecord.id } } : undefined,
          restaurant_name: finalRestaurantName,
          items: itemsForStorage,
          subtotal: foodSubtotal,
          packaging_fee: capPackaging,
          delivery_fee: calcResult.customerBilling.netDeliveryFee,
          platform_fee: calcResult.customerBilling.platformFee,
          handling_fee: calcResult.customerBilling.handlingFee,
          gst: calcResult.customerBilling.gstAmount,
          total_amount: calcResult.customerBilling.grandTotal,
          status: initialStatusTx,
          payment_status: 'pending',
          order_type: resolvedOrderType,
          payment_method: payment_method as string,
          delivery_otp: deliveryOtp,
          tip: Number(tip) || 0,
          discount_amount: calcResult.customerBilling.couponDiscount,
          coupon_code: (coupon_code as string) || undefined,
          commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
          markup_amount: Math.round(
            (canonicalResult.markupAmountPaise + canonicalResult.platformProductMarginPaise) / 100
          ),
          restaurant_payout: vendorNetPayout,
          platform_revenue: platformProfit,
          utr_ref: utr_ref ? String(utr_ref).trim() : undefined,
          financial_snapshot: canonicalResult as any,
          total_amount_paise: canonicalResult.customerPayablePaise,
          idempotency_key: idempotencyKey || undefined,
          delivery_latitude: customerLat != null ? customerLat : undefined,
          delivery_longitude: customerLng != null ? customerLng : undefined,
        },
      })

      // 3. Increment coupon usage
      if (coupon_code && couponResult?.coupon?.id) {
        const claimed = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE coupons
          SET used_count = COALESCE(used_count, 0) + 1
          WHERE id = ${couponResult.coupon.id}
            AND is_active IS NOT FALSE
            AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
          RETURNING id
        `
        if (claimed.length !== 1) {
          throw new Error('COUPON_USAGE_LIMIT_EXCEEDED')
        }
      }

      // 4. Create initial PaymentTransaction
      const paymentGateway = isRazorpayFlow
        ? 'RAZORPAY'
        : String(payment_method).toLowerCase().includes('upi')
          ? 'upi'
          : 'cash_on_delivery'
      await tx.paymentTransaction.create({
        data: {
          id: `tx_${orderId}`,
          order_id: orderId,
          gateway: paymentGateway,
          gateway_payment_id: utr_ref ? String(utr_ref).trim() : null,
          amount: calcResult.customerBilling.grandTotal,
          amount_paise: canonicalResult.customerPayablePaise,
          currency: 'INR',
          status: 'pending',
          idempotency_key: idempotencyKey ? `tx_${idempotencyKey}` : `tx_key_${orderId}`,
          raw_payload: {
            payment_method,
            customer_vpa: customer_vpa || null,
            utr_ref: utr_ref || null,
          },
        },
      })

      // 5. Create payment review (if UTR provided)
      if (utr_ref && !isRazorpayFlow) {
        await tx.paymentReview.create({
          data: {
            id: crypto.randomUUID(),
            order_id: orderId,
            utr_ref: String(utr_ref).trim(),
            customer_vpa: customer_vpa || (actor as any)?.email || 'customer@upi',
            amount: calcResult.customerBilling.grandTotal,
            status: 'pending',
          },
        })
      }

      // 6. Create or upsert vendor settlement
      await tx.vendorSettlement.upsert({
        where: { id: `set_${orderId}` },
        create: {
          id: `set_${orderId}`,
          restaurant_name: finalRestaurantName,
          restaurant_id: restaurantRecord?.id || null,
          gross_sales: foodSubtotal,
          commission_rate: Number(
            restaurantDetails.commission_rate || paymentConfig.vendorCommission || 15
          ),
          commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
          net_payout: vendorNetPayout,
          status: 'scheduled',
          period_start: new Date(),
          period_end: new Date(),
          transaction_ref: orderId,
        },
        update: {},
      })

      return createdOrder
    })
    inventoryCommitted = true
  } catch (txErr: any) {
    await releaseLease()

    if (txErr?.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const itemName = txErr.message.split(':')[1]
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          error: `Item ${itemName} is out of stock or insufficient quantity available`,
        },
        statusCode: 400,
      }
    }

    if (txErr?.message === 'COUPON_USAGE_LIMIT_EXCEEDED') {
      return { success: false, error: 'Coupon usage limit exceeded', statusCode: 400 }
    }

    if (txErr?.code === 'P2002') {
      try {
        const recoveredOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderId },
              ...(idempotencyKey
                ? [{ customer_id: finalCustomerId, idempotency_key: idempotencyKey } as any]
                : []),
              ...(utr_ref ? [{ utr_ref, customer_id: finalCustomerId }] : []),
              {
                customer_id: finalCustomerId,
                created_at: { gte: new Date(Date.now() - 30 * 1000) },
              },
            ],
          },
          orderBy: { created_at: 'desc' },
        })
        if (recoveredOrder) {
          if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
            await completeIdempotency(
              idempotencyKey,
              'order_checkout',
              200,
              { success: true, order: recoveredOrder, orderId: recoveredOrder.id, message: 'Order already processed (idempotent recovery)' },
              idempotencyFencingToken,
              idempotencyRequestHash
            )
            idempotencyAcquired = false
          }
          return {
            success: true,
            order: recoveredOrder,
            orderId: recoveredOrder.id,
            message: 'Order already processed (idempotent recovery)',
          }
        }
      } catch (recoverErr) {
        console.warn('Failed to recover order after P2002 collision:', recoverErr)
      }
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      (txErr?.code === 'ECONNREFUSED' ||
        txErr?.message?.includes('connect') ||
        txErr?.message?.includes('null') ||
        !prisma)
    ) {
      order = {
        id: orderId,
        customer_id: finalCustomerId,
        customer_name: (customer_name as string) || (actor as any)?.name || 'Customer',
        customer_phone: (customer_phone as string) || '+919876543210',
        customer_address: canonicalAddressText,
        restaurant_id: finalRestaurantId || 'rest_spice_garden',
        restaurant_name: finalRestaurantName,
        items: itemsForStorage,
        subtotal: foodSubtotal,
        packaging_fee: capPackaging,
        delivery_fee: calcResult.customerBilling.netDeliveryFee,
        platform_fee: calcResult.customerBilling.platformFee,
        handling_fee: calcResult.customerBilling.handlingFee,
        gst: calcResult.customerBilling.gstAmount,
        total_amount: calcResult.customerBilling.grandTotal,
        status: initialStatus,
        payment_status: 'pending',
        order_type: resolvedOrderType,
        payment_method: payment_method as string,
        delivery_otp: deliveryOtp,
        created_at: new Date().toISOString(),
      }
    } else {
      throw txErr
    }
  }

  // Post-transaction: inventory sync broadcast
  if (inventoryCommitted && !isCraveXPOrder) {
    const changedItemIds = Array.from(new Set(validatedRaw.map(({ itemId }) => itemId)))
    try {
      const changedItems = await prisma.menuItem.findMany({
        where: { id: { in: changedItemIds } },
        include: { variants: { orderBy: { sort_order: 'asc' } } },
      })
      if (finalRestaurantId) {
        await cacheDel(CacheKeys.menus.byRestaurant(finalRestaurantId))
      }
      await Promise.all(
        changedItems.map((item) =>
          broadcast('menu_items', {
            type: 'update',
            item: toMenuItemRealtimeEvent(item),
            timestamp: new Date().toISOString(),
          })
        )
      )
    } catch (inventorySyncError) {
      console.error('[createOrder] Inventory synchronization failed:', inventorySyncError)
    }
  }

  // Register order with WebSocket server
  await broadcast('__internal_register_order', {
    customerId: finalCustomerId,
    orderId,
  })

  // Broadcast to admin channels
  const broadcastOrder = stripOrderSecrets(order as any)
  await broadcast('admin_stats', {
    type: 'new_order',
    order: broadcastOrder,
    orderId,
    timestamp: new Date().toISOString(),
  })
  await broadcast('admin_orders', {
    type: 'new_order',
    order: broadcastOrder,
    orderId,
    timestamp: new Date().toISOString(),
  })
  await broadcast('order_update', {
    type: 'new_order',
    order: broadcastOrder,
    orderId,
    timestamp: new Date().toISOString(),
  })
  await sendWebPushToRoles(['admin'], {
    title: 'New order received',
    body: `${(order as any).customer_name || 'A customer'} placed order #${orderId.slice(-8)} for ₹${Number((order as any).total_amount || 0).toLocaleString('en-IN')} from ${(order as any).restaurant_name}.`,
    url: '/admin/dashboard',
    tag: `admin-new-order-${orderId}`,
    orderId,
  }).catch((pushError) => console.error('[createOrder] Admin Web Push failed:', pushError))

  invalidateOrdersCache()

  const responseData = {
    success: true,
    message: 'Order created successfully!',
    order: order,
    orderId: order.id,
    billing: billingBreakdown,
  }

  // Complete idempotency
  if (idempotencyKey) {
    if (!idempotencyFencingToken || !idempotencyRequestHash) {
      throw new Error('Checkout idempotency lease ownership was lost')
    }
    const completed = await completeIdempotency(
      idempotencyKey,
      'order_checkout',
      201,
      responseData,
      idempotencyFencingToken,
      idempotencyRequestHash
    )
    if (!completed) throw new Error('Checkout idempotency completion was rejected')
  }

  return {
    success: true,
    order: order,
    orderId: order.id,
    billing: billingBreakdown,
  }
  } finally {
    // Release idempotency lease if still acquired (not completed or released)
    if (idempotencyAcquired && idempotencyKey && idempotencyFencingToken) {
      await releaseIdempotency(idempotencyKey, 'order_checkout', idempotencyFencingToken).catch(() => {})
    }
  }
}

async function getActiveConfig(): Promise<PaymentConfig> {
  const dbConfig: any = await getActivePaymentConfig()
  if (!dbConfig) {
    return DEFAULT_PAYMENT_CONFIG
  }
  return {
    ...DEFAULT_PAYMENT_CONFIG,
    upiVpa: dbConfig.merchant_vpa || DEFAULT_PAYMENT_CONFIG.upiVpa,
    merchantName: dbConfig.merchant_name || DEFAULT_PAYMENT_CONFIG.merchantName,
    thankYouMessage: dbConfig.thank_you_message || DEFAULT_PAYMENT_CONFIG.thankYouMessage,
    mccCode: dbConfig.merchant_category_code || DEFAULT_PAYMENT_CONFIG.mccCode,
    ifscCode: dbConfig.ifsc_code || DEFAULT_PAYMENT_CONFIG.ifscCode,
    accountNumber: dbConfig.account_number || DEFAULT_PAYMENT_CONFIG.accountNumber,
    platformFee:
      dbConfig.platform_fee != null
        ? Number(dbConfig.platform_fee)
        : DEFAULT_PAYMENT_CONFIG.platformFee,
    handlingFee:
      dbConfig.handling_fee != null
        ? Number(dbConfig.handling_fee)
        : DEFAULT_PAYMENT_CONFIG.handlingFee,
    vendorCommission:
      dbConfig.vendor_commission != null
        ? Number(dbConfig.vendor_commission)
        : DEFAULT_PAYMENT_CONFIG.vendorCommission,
    packagingCap:
      dbConfig.packaging_cap != null
        ? Number(dbConfig.packaging_cap)
        : DEFAULT_PAYMENT_CONFIG.packagingCap,
    gstRatePercent:
      dbConfig.gst_rate_percent != null
        ? Number(dbConfig.gst_rate_percent)
        : dbConfig.gst_rate != null
          ? Number(dbConfig.gst_rate)
          : DEFAULT_PAYMENT_CONFIG.gstRatePercent,
    baseDeliveryFee:
      dbConfig.delivery_fee != null
        ? Number(dbConfig.delivery_fee)
        : DEFAULT_PAYMENT_CONFIG.baseDeliveryFee,
    baseDistanceKm:
      dbConfig.base_distance_km != null
        ? Number(dbConfig.base_distance_km)
        : DEFAULT_PAYMENT_CONFIG.baseDistanceKm,
    perKmRate:
      dbConfig.per_km_rate != null
        ? Number(dbConfig.per_km_rate)
        : DEFAULT_PAYMENT_CONFIG.perKmRate,
    freeDeliveryThreshold:
      dbConfig.free_delivery_threshold != null
        ? Number(dbConfig.free_delivery_threshold)
        : DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold,
    driverPayoutShare:
      dbConfig.driver_payout_share != null
        ? Number(dbConfig.driver_payout_share)
        : DEFAULT_PAYMENT_CONFIG.driverPayoutShare,
    surgeMultiplier:
      dbConfig.surge_multiplier != null
        ? Number(dbConfig.surge_multiplier)
        : DEFAULT_PAYMENT_CONFIG.surgeMultiplier,
    rainFee: dbConfig.rain_fee != null ? Number(dbConfig.rain_fee) : DEFAULT_PAYMENT_CONFIG.rainFee,
    nightSurgeFee:
      dbConfig.night_surge_fee != null
        ? Number(dbConfig.night_surge_fee)
        : DEFAULT_PAYMENT_CONFIG.nightSurgeFee,
    isRainModeActive: dbConfig.is_rain_mode_active ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive,
    isNightSurgeActive: dbConfig.is_night_surge_active ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
    enableCashOnDelivery:
      dbConfig.enable_cash_on_delivery ?? DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery,
    enableUpiDeepLink: dbConfig.enable_upi_deep_link ?? DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink,
    requireUtrNumber: dbConfig.require_utr_number ?? DEFAULT_PAYMENT_CONFIG.requireUtrNumber,
  }
}
