import {
  AuthError,
  getAuthActor,
  handleAuthError,
  requireAuth,
  requireRole,
} from '@/lib/auth-helpers'
import { canReadOrder, sanitizeOrderForActor, stripOrderSecrets } from '@/lib/auth/order-access'
import { CRAVEXP_DARK_STORE_ID } from '@/lib/cravexp-grocery-catalog'
import {
  dispatchPendingOutboxEvents,
  findOrderById,
  invalidateOrdersCache,
  listOrders,
  updateOrder,
} from '@/lib/dal'
import { validateAndApplyCoupon } from '@/lib/dal/coupons'
import { findMenuItemsByIds } from '@/lib/dal/menu-items'
import { getActivePaymentConfig, updatePaymentReviewStatus } from '@/lib/dal/payments'
import { findRestaurantById } from '@/lib/dal/restaurants'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import {
  processPaymentRejectionTx,
  processPaymentVerificationTx,
} from '@/lib/finance/payment-service'
import {
  calculateOrderPrice,
  tolegacyCalculatorResult,
  type OrderPriceInput,
} from '@/lib/finance/pricing-engine'
import type { PriceTaxMode } from '@/lib/finance/tax-engine'
import { acquireIdempotency, completeIdempotency, releaseIdempotency } from '@/lib/idempotency'
import { withTiming } from '@/lib/instrumentation'
import { calculateMenuAppPrice } from '@/lib/menu-pricing'
import { sendDriverPushToAll, sendDriverPushToUsers } from '@/lib/notifications/driver-push'
import { getPhaseName, isValidTransition, VALID_TRANSITIONS } from '@/lib/order-state-machine'
import { maybeTriggerRouteSettlement } from '@/lib/payments/razorpay-split'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { sendWebPushToRoles, sendWebPushToUsers, type WebPushPayload } from '@/lib/web-push'
import { Prisma, type OrderStatus } from '@prisma/client'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

const DRIVER_OFFER_STATUSES = new Set<OrderStatus>([
  'sent_to_vendor',
  'preparing',
  'packing',
  'ready_for_pickup',
])

async function getActiveConfig(): Promise<PaymentConfig> {
  const db = (await getActivePaymentConfig()) as any
  if (!db) return DEFAULT_PAYMENT_CONFIG
  return {
    ...DEFAULT_PAYMENT_CONFIG,
    upiVpa: db.merchant_vpa || DEFAULT_PAYMENT_CONFIG.upiVpa,
    merchantName: db.merchant_name || DEFAULT_PAYMENT_CONFIG.merchantName,
    thankYouMessage: db.thank_you_message || DEFAULT_PAYMENT_CONFIG.thankYouMessage,
    mccCode: db.merchant_category_code || DEFAULT_PAYMENT_CONFIG.mccCode,
    ifscCode: db.ifsc_code || DEFAULT_PAYMENT_CONFIG.ifscCode,
    accountNumber: db.account_number || DEFAULT_PAYMENT_CONFIG.accountNumber,
    platformFee: db.platform_fee != null ? Number(db.platform_fee) : DEFAULT_PAYMENT_CONFIG.platformFee,
    handlingFee: db.handling_fee != null ? Number(db.handling_fee) : DEFAULT_PAYMENT_CONFIG.handlingFee,
    vendorCommission: db.vendor_commission != null ? Number(db.vendor_commission) : DEFAULT_PAYMENT_CONFIG.vendorCommission,
    packagingCap: db.packaging_cap != null ? Number(db.packaging_cap) : DEFAULT_PAYMENT_CONFIG.packagingCap,
    gstRatePercent: Number(db.gst_rate_percent ?? db.gst_rate ?? DEFAULT_PAYMENT_CONFIG.gstRatePercent),
    baseDeliveryFee: db.delivery_fee != null ? Number(db.delivery_fee) : DEFAULT_PAYMENT_CONFIG.baseDeliveryFee,
    baseDistanceKm: db.base_distance_km != null ? Number(db.base_distance_km) : DEFAULT_PAYMENT_CONFIG.baseDistanceKm,
    perKmRate: db.per_km_rate != null ? Number(db.per_km_rate) : DEFAULT_PAYMENT_CONFIG.perKmRate,
    freeDeliveryThreshold: db.free_delivery_threshold != null ? Number(db.free_delivery_threshold) : DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold,
    driverPayoutShare: db.driver_payout_share != null ? Number(db.driver_payout_share) : DEFAULT_PAYMENT_CONFIG.driverPayoutShare,
    surgeMultiplier: db.surge_multiplier != null ? Number(db.surge_multiplier) : DEFAULT_PAYMENT_CONFIG.surgeMultiplier,
    rainFee: db.rain_fee != null ? Number(db.rain_fee) : DEFAULT_PAYMENT_CONFIG.rainFee,
    nightSurgeFee: db.night_surge_fee != null ? Number(db.night_surge_fee) : DEFAULT_PAYMENT_CONFIG.nightSurgeFee,
    isRainModeActive: db.is_rain_mode_active ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive,
    isNightSurgeActive: db.is_night_surge_active ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
    enableCashOnDelivery: db.enable_cash_on_delivery ?? DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery,
    enableUpiDeepLink: db.enable_upi_deep_link ?? DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink,
    requireUtrNumber: db.require_utr_number ?? DEFAULT_PAYMENT_CONFIG.requireUtrNumber,
  }
}

function getMockRestaurant(id?: string, name?: string) {
  return {
    id: id || 'rest_spice_garden',
    name: name || 'Spice Garden',
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
}

async function resolveCustomerAddress(customerId: string, body: any) {
  const targetId = body.address_id || body.addressId
  let addrRecord: any = null

  if (targetId) {
    addrRecord = await prisma.customerAddress.findFirst({
      where: { id: targetId, customer_id: customerId },
      select: { latitude: true, longitude: true, address: true, label: true },
    })
    if (!addrRecord) {
      throw new Error('Selected delivery address not found. Please choose a valid address.')
    }
  } else {
    addrRecord = await prisma.customerAddress.findFirst({
      where: { customer_id: customerId, is_default: true },
      select: { latitude: true, longitude: true, address: true, label: true },
    })
    if (!addrRecord) {
      addrRecord = await prisma.customerAddress.findFirst({
        where: { customer_id: customerId },
        select: { latitude: true, longitude: true, address: true, label: true },
      })
    }
  }

  let lat = addrRecord?.latitude != null ? Number(addrRecord.latitude) : null
  let lng = addrRecord?.longitude != null ? Number(addrRecord.longitude) : null

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    const rawLat = body.delivery_latitude ?? body.latitude
    const rawLng = body.delivery_longitude ?? body.longitude
    if (rawLat != null && rawLng != null && Number.isFinite(Number(rawLat)) && Number.isFinite(Number(rawLng))) {
      lat = Number(rawLat)
      lng = Number(rawLng)
    } else {
      lat = 12.9716
      lng = 77.5946
    }
  }

  const text =
    addrRecord?.address ||
    (typeof body.customer_address === 'string' && body.customer_address.trim() ? body.customer_address.trim() : '') ||
    addrRecord?.label ||
    'Bengaluru, Karnataka'

  return { customerLat: lat, customerLng: lng, canonicalAddressText: text, customerAddressState: 'Karnataka' }
}

export async function GET(request: Request) {
  return withTiming('GET /api/orders', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const orderId = searchParams.get('orderId')
      const customerId = searchParams.get('customerId')
      const vendorId = searchParams.get('vendorId')
      const vendorName = searchParams.get('vendorName')
      const driverId = searchParams.get('driverId') || searchParams.get('riderId')

      if (orderId) {
        const actor = await requireAuth(request)
        const order = await findOrderById(orderId).catch(() => null)
        if (!order) return NextResponse.json({ success: true, order: null, orders: [] })

        if (!canReadOrder(actor, order)) {
          return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 })
        }

        const isVendorActor =
          actor.role === 'restaurant_vendor' ||
          actor.role === 'cravexp_store_vendor' ||
          (actor.role as string) === 'vendor'

        if (isVendorActor || vendorId || vendorName) {
          const isApproved =
            order.payment_status === 'verified' ||
            !['payment_pending', 'payment_submitted'].includes(order.status)
          if (!isApproved) return NextResponse.json({ success: true, order: null, orders: [] })
        }

        const sinceParam = searchParams.get('since')
        let missedEvents: any[] = []
        if (sinceParam) {
          const sinceDate = isNaN(Number(sinceParam)) ? new Date(sinceParam) : new Date(Number(sinceParam))
          if (!isNaN(sinceDate.getTime())) {
            missedEvents = await prisma.orderOutbox.findMany({
              where: { order_id: orderId, created_at: { gt: sinceDate } },
              orderBy: { created_at: 'asc' },
              take: 50,
            }).catch(() => [])
          }
        }

        const { getDriverLocation } = await import('@/lib/dispatch/driver-tracker')
        let driverLocation = order.rider_id ? getDriverLocation(order.rider_id) : undefined

        if (!driverLocation && order.delivery_latitude && order.delivery_longitude) {
          const lastUpdated = order.created_at ? new Date(order.created_at).getTime() : Date.now()
          const ageMs = Date.now() - lastUpdated
          driverLocation = {
            driverId: order.rider_id || 'unknown',
            name: order.driver_name || 'Assigned Driver',
            phone: order.driver_phone || '',
            vehicleType: 'EV_SCOOTER',
            status: 'ON_TRIP',
            available: false,
            lat: Number(order.delivery_latitude),
            lng: Number(order.delivery_longitude),
            h3Cell: '',
            resolution: 8,
            lastUpdated,
            isStale: ageMs > 45000,
            staleDurationSeconds: Math.floor(ageMs / 1000),
          }
        }

        return NextResponse.json({
          success: true,
          serverTime: new Date().toISOString(),
          order: sanitizeOrderForActor(actor, order),
          orders: [sanitizeOrderForActor(actor, order)],
          driverLocation: driverLocation || null,
          missedEvents: missedEvents.map((evt) => ({
            id: evt.id,
            eventType: evt.event_type,
            payload: typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload,
            createdAt: evt.created_at.toISOString(),
          })),
        })
      }

      const actor = await getAuthActor(request)
      const isVendorActor =
        actor?.role === 'restaurant_vendor' ||
        actor?.role === 'cravexp_store_vendor' ||
        (actor?.role as string) === 'vendor'

      if (!actor && !isVendorActor) {
        return handleAuthError(new AuthError('Authentication required', 401))
      }

      let scopedCustomerId = customerId ?? undefined
      let scopedDriverId = driverId ?? undefined
      let scopedRestaurantId = vendorId ?? undefined

      if (actor && actor.role !== 'admin') {
        if (actor.role === 'user' || (actor.role as string) === 'customer') {
          scopedCustomerId = actor.id
        } else if (actor.role === 'rider' || (actor.role as string) === 'driver') {
          scopedDriverId = actor.id
        } else if (isVendorActor) {
          scopedRestaurantId = actor.restaurantId || actor.restaurant_id || undefined
          if (!scopedRestaurantId) {
            return NextResponse.json({ error: 'Vendor account is not linked to a restaurant' }, { status: 403 })
          }
        }
      }

      const isRiderActor = actor?.role === 'rider' || (actor?.role as string) === 'driver'
      const orders = await listOrders({
        customerId: scopedCustomerId,
        restaurantId: scopedRestaurantId,
        restaurantName: vendorName ?? undefined,
        driverId: scopedDriverId,
        onlyApprovedForVendor: isVendorActor ? true : undefined,
        includeAvailableForRider:
          isRiderActor || (actor?.role === 'admin' && Boolean(searchParams.get('available'))),
      })

      return NextResponse.json({
        success: true,
        orders: orders.map((order) => sanitizeOrderForActor(actor!, order)),
      })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}

export async function POST(request: Request) {
  return withTiming('POST /api/orders', async (mark) => {
    try {
      const clientIp = getClientIp(request)
      const rateCheck = await checkRateLimit(`order_${clientIp}`, 'ORDER_CREATE')
      if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetTime, rateCheck.retryAfter)
      }

      const actor = await requireRole(request, ['user', 'admin'])
      mark('auth')

      const body = await request.json()
      const {
        id,
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
      const finalCustomerId = actor.id
      const idempotencyKey =
        request.headers.get('x-idempotency-key') ||
        request.headers.get('idempotency-key') ||
        body.idempotency_key ||
        body.idempotencyKey ||
        null
      const orderId = id || crypto.randomUUID()
      const paymentConfig = await getActiveConfig()
      const isCustomerActor = actor.role === 'user' || (actor.role as string) === 'customer'
      const isRazorpayFlow = true // Razorpay is the exclusive automated gateway

      if (idempotencyKey) {
        const idemCheck = await acquireIdempotency(idempotencyKey, 'order_checkout', body)
        if (idemCheck.status === 'completed') {
          return NextResponse.json(idemCheck.body, { status: idemCheck.statusCode || 200 })
        }
        if (idemCheck.status === 'processing') {
          return NextResponse.json(
            { error: 'An order checkout with this idempotency key is already in progress. Please retry shortly.' },
            { status: 409, headers: { 'Retry-After': '2' } }
          )
        }
      }

      // Check existing active orders
      if (id) {
        const existing = await prisma.order.findUnique({ where: { id } }).catch(() => null)
        if (existing) {
          if (existing.customer_id !== finalCustomerId) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
          }
          if (!['delivered', 'completed', 'cancelled'].includes(existing.status)) {
            return NextResponse.json({
              success: true,
              order: sanitizeOrderForActor(actor, existing),
              orderId: existing.id,
              message: 'Order already processed (idempotent)',
            })
          }
        }
      }

      let restaurant: any = null
      if (restaurant_id) {
        restaurant = await findRestaurantById(restaurant_id).catch(() => null)
        if (!restaurant) {
          if (process.env.NODE_ENV !== 'production') {
            restaurant = getMockRestaurant(restaurant_id, restaurant_name)
          } else {
            return NextResponse.json({ error: `Restaurant not found: ${restaurant_id}` }, { status: 404 })
          }
        }
      }

      const rawItems: any[] = Array.isArray(items)
        ? items
        : typeof items === 'string'
          ? JSON.parse(items)
          : []

      if (rawItems.length === 0) {
        return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
      }

      type RawItemEntry = { itemId: string; variantId?: string; quantity: number; raw: any }
      const validatedRaw: RawItemEntry[] = []

      for (const rawItem of rawItems) {
        const itemId = rawItem.menuItemId || rawItem.menu_item_id || rawItem.itemId || rawItem.id
        const variantId = rawItem.variantId || rawItem.variant_id || undefined
        const quantity = Math.floor(Number(rawItem.quantity || rawItem.qty || 1))

        if (!itemId) {
          return NextResponse.json({ error: 'Each item must have an itemId/menuItemId' }, { status: 400 })
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
          return NextResponse.json({ error: `Invalid quantity for item ${itemId}` }, { status: 400 })
        }
        validatedRaw.push({ itemId, variantId, quantity, raw: rawItem })
      }

      const allItemIds = validatedRaw.map((r) => r.itemId)
      let menuItemMap = new Map<string, any>()

      if (isCraveXPOrder) {
        const products = await prisma.craveXPProduct.findMany({ where: { id: { in: allItemIds } } }).catch(() => [])
        menuItemMap = new Map(products.map((p) => [p.id, { ...p, restaurant_id: CRAVEXP_DARK_STORE_ID }]))
      } else {
        menuItemMap = await findMenuItemsByIds(allItemIds).catch(() => new Map())
      }

      const itemsList: any[] = []
      let foodSubtotal = 0

      for (const { itemId, variantId, quantity } of validatedRaw) {
        let menuItem = menuItemMap.get(itemId)
        if (!menuItem) {
          if (process.env.NODE_ENV !== 'production') {
            menuItem = {
              id: itemId,
              name: 'Artisan Dish',
              price: 250,
              restaurant_id: restaurant?.id || restaurant_id || 'rest_spice_garden',
              in_stock: true,
              stock_count: 99,
              category: 'food',
            }
          } else {
            return NextResponse.json(
              { error: `${isCraveXPOrder ? 'XP product' : 'Menu item'} not found: ${itemId}` },
              { status: 404 }
            )
          }
        }

        if (restaurant && menuItem.restaurant_id && menuItem.restaurant_id !== restaurant.id) {
          return NextResponse.json(
            { error: `Item "${menuItem.name}" does not belong to ${restaurant.name || restaurant_name}. All items in an order must be from a single restaurant.` },
            { status: 400 }
          )
        }

        if (menuItem.in_stock === false || (menuItem.stock_count != null && menuItem.stock_count < quantity)) {
          if (idempotencyKey) await releaseIdempotency(idempotencyKey, 'order_checkout')
          return NextResponse.json({ error: `Item ${menuItem.name} is out of stock` }, { status: 400 })
        }

        const variants = Array.isArray(menuItem.variants) ? menuItem.variants : []
        const selectedVariant =
          variants.length > 0
            ? variantId
              ? variants.find((v: any) => v.id === variantId)
              : variants.find((v: any) => v.is_default) || variants[0]
            : null

        const restaurantPrice = Number(
          selectedVariant?.restaurant_price ?? menuItem.restaurant_price ?? selectedVariant?.price ?? menuItem.price ?? 0
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

        const lineTotal = price * quantity
        foodSubtotal += lineTotal

        const itemCategory = (menuItem.category || '').toLowerCase()
        let taxRate = paymentConfig.gstRatePercent ?? 5
        if (itemCategory.includes('alcohol')) taxRate = 28
        else if (itemCategory.includes('packaged') || itemCategory.includes('grocery')) taxRate = 18
        else if (itemCategory.includes('beverage') || itemCategory.includes('drink')) taxRate = 12

        itemsList.push({
          id: itemId,
          variantId: selectedVariant?.id || null,
          variantName: selectedVariant?.name || null,
          name: menuItem.name,
          quantity,
          price,
          restaurantPrice,
          hasExplicitRestaurantPrice: selectedVariant != null || menuItem.restaurant_price != null,
          platformProductMargin: (price - restaurantPrice) * quantity,
          lineTotal,
          taxRate,
          priceTaxMode: (menuItem.price_tax_mode || 'TAX_INCLUSIVE') as PriceTaxMode,
          _menuItem: menuItem,
        })
      }

      const finalRestaurantId = restaurant?.id || itemsList[0]?._menuItem?.restaurant_id || 'rest_spice_garden'

      // Strict Invariant: Only one restaurant allowed per order
      const hasMultiRestaurantItems = itemsList.some(
        (it) => it._menuItem?.restaurant_id && it._menuItem.restaurant_id !== finalRestaurantId
      )
      if (hasMultiRestaurantItems) {
        return NextResponse.json(
          { error: 'All items in an order must belong to a single restaurant. Multi-restaurant carts are not allowed.' },
          { status: 400 }
        )
      }

      const restaurantDetails = restaurant || getMockRestaurant(finalRestaurantId, restaurant_name)
      const finalRestaurantName = restaurantDetails.name || restaurant_name || 'Crave Restaurant'

      let couponDiscountAmount = 0
      let couponResult: any = null
      if (coupon_code) {
        couponResult = await validateAndApplyCoupon(coupon_code, foodSubtotal, finalRestaurantId)
        if (!couponResult.valid) {
          return NextResponse.json({ error: couponResult.error || 'Invalid coupon' }, { status: 400 })
        }
        couponDiscountAmount = couponResult.discount
      }

      const commercialModel = (restaurantDetails?.commercial_model || 'commission') as 'commission' | 'markup' | 'hybrid'
      let addrInfo: any
      try {
        addrInfo = await resolveCustomerAddress(finalCustomerId, body)
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }

      const { customerLat, customerLng, canonicalAddressText, customerAddressState } = addrInfo

      const serverCalculatedDistanceKm = calculateRoadTravelDistanceKm(
        restaurantDetails.latitude ? Number(restaurantDetails.latitude) : null,
        restaurantDetails.longitude ? Number(restaurantDetails.longitude) : null,
        customerLat,
        customerLng
      )

      const pricingInput: OrderPriceInput = {
        orderId,
        orderType: resolvedOrderType,
        restaurantId: finalRestaurantId,
        restaurantName: finalRestaurantName,
        supplierState: restaurantDetails.supplier_state || 'Karnataka',
        customerState: customerAddressState || 'Karnataka',
        items: itemsList.map((i) => ({
          name: i.name,
          hsnSacCode: i._menuItem?.hsn_sac_code || '996331',
          quantity: i.quantity,
          unitPricePaise: Math.round(i.price * 100),
          restaurantUnitPricePaise: i.hasExplicitRestaurantPrice ? Math.round(i.restaurantPrice * 100) : undefined,
          priceTaxMode: i.priceTaxMode,
          taxCategory:
            resolvedOrderType === 'cravexp_grocery'
              ? i.taxRate === 18
                ? 'GROCERY_18PCT'
                : i.taxRate === 12
                  ? 'GROCERY_12PCT'
                  : 'GROCERY_5PCT'
              : 'RESTAURANT_SERVICE',
          taxRatePercent: i.taxRate,
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
        tipPaise: Math.round((tip || 0) * 100),
        contract: {
          contractNumber: restaurantDetails.contract_number || 'DEFAULT',
          version: 1,
          commercialModel,
          commissionRatePercent: Number(restaurantDetails.commission_rate ?? paymentConfig.vendorCommission ?? 15),
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

      const billingBreakdown = {
        subtotal: foodSubtotal,
        commercial_model: commercialModel,
        markup_rate: Number(restaurantDetails.markup_rate || 0),
        markup_amount: Math.round(canonicalResult.markupAmountPaise / 100),
        product_margin: Math.round(canonicalResult.platformProductMarginPaise / 100),
        restaurant_base_subtotal: Math.round(canonicalResult.restaurantBaseSubtotalPaise / 100),
        packaging_fee: calcResult.customerBilling.packagingFee,
        delivery_fee: calcResult.customerBilling.netDeliveryFee,
        platform_fee: calcResult.customerBilling.platformFee,
        handling_fee: calcResult.customerBilling.handlingFee,
        gst: calcResult.customerBilling.gstAmount,
        gst_rate_percent: itemsList[0]?.taxRate ?? paymentConfig.gstRatePercent ?? 5,
        tip: calcResult.customerBilling.tip,
        discount_amount: calcResult.customerBilling.couponDiscount,
        total_amount: calcResult.customerBilling.grandTotal,
        vendor_commission_rate: Number(restaurantDetails.commission_rate || paymentConfig.vendorCommission || 15),
        vendor_commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
        vendor_net_payout: vendorNetPayout,
        driver_payout: driverPayout,
        driver_base_payout: calcResult.driverEarnings.baseDistanceShare,
        driver_extra_distance_payout: calcResult.driverEarnings.extraDistanceShare,
        driver_surge_payout: calcResult.driverEarnings.surgeRainShare,
        driver_payout_share: paymentConfig.driverPayoutShare,
        platform_net_profit: platformProfit,
      }

      const itemsForStorage = itemsList.map(({ _menuItem, ...rest }) => rest)
      if (itemsForStorage.length > 0) itemsForStorage[0].billing_breakdown = billingBreakdown

      const deliveryOtp = String(crypto.randomInt(100000, 999999))
      const initialStatus: OrderStatus = 'payment_pending'

      let order: any
      try {
        order = await prisma.$transaction(async (tx: any) => {
          for (const { itemId, quantity } of validatedRaw) {
            const item = menuItemMap.get(itemId)
            if (item && typeof item.stock_count === 'number' && item.stock_count > 0) {
              const inventory = isCraveXPOrder ? tx.craveXPProduct : tx.menuItem
              const updated = await inventory.updateMany({
                where: { id: itemId, in_stock: true, stock_count: { gte: quantity } },
                data: { stock_count: { decrement: quantity } },
              })
              if (updated.count === 0) throw new Error(`INSUFFICIENT_STOCK:${item.name || itemId}`)
            }
          }

          const customerRecord = await tx.user.findUnique({ where: { id: finalCustomerId }, select: { id: true } }).catch(() => null)
          const restaurantRecord = await tx.restaurant.findUnique({ where: { id: finalRestaurantId }, select: { id: true } }).catch(() => null)

          const createdOrder = await tx.order.create({
            data: {
              id: orderId,
              customer: customerRecord ? { connect: { id: customerRecord.id } } : undefined,
              customer_name: customer_name || (actor as any)?.name || 'Customer',
              customer_phone: customer_phone || undefined,
              customer_address: canonicalAddressText,
              restaurant: restaurantRecord ? { connect: { id: restaurantRecord.id } } : undefined,
              restaurant_name: finalRestaurantName,
              items: itemsForStorage,
              subtotal: foodSubtotal,
              packaging_fee: calcResult.customerBilling.packagingFee,
              delivery_fee: calcResult.customerBilling.netDeliveryFee,
              platform_fee: calcResult.customerBilling.platformFee,
              handling_fee: calcResult.customerBilling.handlingFee,
              gst: calcResult.customerBilling.gstAmount,
              total_amount: calcResult.customerBilling.grandTotal,
              status: initialStatus,
              payment_status: 'pending',
              order_type: resolvedOrderType,
              payment_method: 'razorpay',
              delivery_otp: deliveryOtp,
              tip: Number(tip) || 0,
              discount_amount: calcResult.customerBilling.couponDiscount,
              coupon_code: coupon_code || undefined,
              commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
              markup_amount: Math.round((canonicalResult.markupAmountPaise + canonicalResult.platformProductMarginPaise) / 100),
              restaurant_payout: vendorNetPayout,
              platform_revenue: platformProfit,
              financial_snapshot: canonicalResult as any,
              total_amount_paise: canonicalResult.customerPayablePaise,
              idempotency_key: idempotencyKey || undefined,
              delivery_latitude: customerLat != null ? customerLat : undefined,
              delivery_longitude: customerLng != null ? customerLng : undefined,
            },
          })

          if (coupon_code && couponResult?.coupon?.id) {
            const claimed = await tx.$queryRaw<Array<{ id: string }>>`
              UPDATE coupons
              SET used_count = COALESCE(used_count, 0) + 1
              WHERE id = ${couponResult.coupon.id}
                AND is_active IS NOT FALSE
                AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
              RETURNING id
            `
            if (claimed.length !== 1) throw new Error('COUPON_USAGE_LIMIT_EXCEEDED')
          }

          await tx.paymentTransaction.create({
            data: {
              id: `tx_${orderId}`,
              order_id: orderId,
              gateway: 'RAZORPAY',
              gateway_payment_id: null,
              amount: calcResult.customerBilling.grandTotal,
              amount_paise: canonicalResult.customerPayablePaise,
              currency: 'INR',
              status: 'pending',
              idempotency_key: idempotencyKey ? `tx_${idempotencyKey}` : `tx_key_${orderId}`,
              raw_payload: { payment_method: 'razorpay' },
            },
          })

          await tx.vendorSettlement.upsert({
            where: { id: `set_${orderId}` },
            create: {
              id: `set_${orderId}`,
              restaurant_name: finalRestaurantName,
              restaurant_id: restaurantRecord?.id || null,
              gross_sales: foodSubtotal,
              commission_rate: Number(restaurantDetails.commission_rate || paymentConfig.vendorCommission || 15),
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
        mark('db')
      } catch (txErr: any) {
        if (idempotencyKey) await releaseIdempotency(idempotencyKey, 'order_checkout')
        if (txErr?.message?.startsWith('INSUFFICIENT_STOCK:')) {
          return NextResponse.json(
            { error: `Item ${txErr.message.split(':')[1]} is out of stock` },
            { status: 400 }
          )
        }
        if (txErr?.message === 'COUPON_USAGE_LIMIT_EXCEEDED') {
          return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 })
        }
        if (txErr?.code === 'P2002') {
          const recovered = await prisma.order.findFirst({
            where: {
              OR: [
                { id: orderId },
                ...(idempotencyKey ? [{ customer_id: finalCustomerId, idempotency_key: idempotencyKey } as any] : []),
              ],
            },
          }).catch(() => null)
          if (recovered) {
            return NextResponse.json({ success: true, order: recovered, orderId: recovered.id, message: 'Order already processed (idempotent recovery)' })
          }
        }
        throw txErr
      }

      await broadcast('__internal_register_order', { customerId: finalCustomerId, orderId })
      const broadcastOrder = stripOrderSecrets(order as any)
      await broadcast('admin_stats', { type: 'new_order', order: broadcastOrder, orderId, timestamp: new Date().toISOString() })
      await broadcast('admin_orders', { type: 'new_order', order: broadcastOrder, orderId, timestamp: new Date().toISOString() })
      await broadcast('order_update', { type: 'new_order', order: broadcastOrder, orderId, timestamp: new Date().toISOString() })

      await sendWebPushToRoles(['admin'], {
        title: 'New order received',
        body: `${order.customer_name || 'A customer'} placed order #${orderId.slice(-8)} for ₹${Number(order.total_amount || 0).toLocaleString('en-IN')} from ${order.restaurant_name}.`,
        url: '/admin/dashboard',
        tag: `admin-new-order-${orderId}`,
        orderId,
      }).catch(() => {})

      mark('broadcast')

      const responseData = {
        success: true,
        message: 'Order created successfully!',
        order: sanitizeOrderForActor(actor, order),
        orderId: order.id,
        billing: billingBreakdown,
      }

      if (idempotencyKey) {
        await completeIdempotency(idempotencyKey, 'order_checkout', 201, responseData)
      }

      return NextResponse.json(responseData, { status: 201 })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}

export async function PATCH(request: Request) {
  return withTiming('PATCH /api/orders', async () => {
    try {
      const actor = await requireAuth(request)
      const body = await request.json()
      const {
        orderId,
        status,
        payment_status,
        paymentStatus,
        driver_name,
        driver_phone,
        driver_id,
        driver_lat,
        driver_lng,
        items,
      } = body

      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

      const existing = await findOrderById(orderId)
      if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

      const vendorStatuses: OrderStatus[] = ['preparing', 'packing', 'ready_for_pickup']
      const riderStatuses: OrderStatus[] = [
        'rider_assigned',
        'ready_for_pickup',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'completed',
      ]
      const requestedStatus = status as OrderStatus | undefined
      const isVendor =
        (actor.role === 'restaurant_vendor' || actor.role === 'cravexp_store_vendor') &&
        (existing.restaurant_id === (actor as any).restaurantId || existing.restaurant_name === actor.restaurantName)
      const isRiderOrDriver = actor.role === 'rider' || (actor.role as string) === 'driver'
      const isAdmin = actor.role === 'admin'
      const isAssignedRider = isAdmin || (isRiderOrDriver && existing.rider_id !== null && existing.rider_id === actor.id)

      if (requestedStatus === 'delivered' || requestedStatus === 'completed') {
        if (!isAdmin && !isAssignedRider) {
          return NextResponse.json({ error: 'Only the assigned driver can confirm delivery' }, { status: 403 })
        }

        if (!isAdmin) {
          if (!existing.delivery_otp) {
            return NextResponse.json({ error: 'Delivery OTP has not been issued for this order' }, { status: 422 })
          }
          if ((existing as any).otp_consumed_at) {
            return NextResponse.json({ error: 'Delivery OTP has already been used' }, { status: 409 })
          }

          const providedOtp = String(body.otp || body.delivery_otp || '').trim()
          const storedOtp = String(existing.delivery_otp).trim()
          const otpMatch =
            providedOtp.length === storedOtp.length &&
            crypto.timingSafeEqual(Buffer.from(providedOtp, 'utf8'), Buffer.from(storedOtp, 'utf8'))
          if (!otpMatch) {
            return NextResponse.json({ error: 'Invalid delivery OTP. Valid delivery OTP is required' }, { status: 400 })
          }
        }
      }

      const canUpdateStatus =
        isAdmin ||
        (isVendor && requestedStatus && vendorStatuses.includes(requestedStatus)) ||
        (isRiderOrDriver && isAssignedRider && requestedStatus && riderStatuses.includes(requestedStatus)) ||
        (requestedStatus === 'cancelled' && existing.customer_id === actor.id && existing.status === 'payment_pending')

      const canUpdatePaymentStatus = isAdmin
      const canUpdateDriverInfo = isAdmin || (isRiderOrDriver && isAssignedRider)
      const canUpdateItems = isAdmin || (isVendor && existing.status === 'payment_submitted')
      const canUpdateCoordinates = isAdmin || (isRiderOrDriver && isAssignedRider)

      const hasStatusChange = !!status
      const hasPaymentStatusChange = !!(payment_status || paymentStatus)
      const hasDriverInfoChange = !!(driver_name || driver_phone || driver_id)
      const hasCoordinateChange = !!(driver_lat != null || driver_lng != null)
      const hasItemsChange = !!items

      if (hasStatusChange && hasPaymentStatusChange) {
        return NextResponse.json({ error: 'Update payment status and fulfillment status in separate requests' }, { status: 400 })
      }

      const allowed =
        (hasStatusChange && canUpdateStatus) ||
        (hasPaymentStatusChange && canUpdatePaymentStatus) ||
        (hasDriverInfoChange && canUpdateDriverInfo) ||
        (hasCoordinateChange && canUpdateCoordinates) ||
        (hasItemsChange && canUpdateItems)

      if (!allowed) {
        return NextResponse.json({ error: 'You are not allowed to update this order' }, { status: 403 })
      }

      if (hasStatusChange) {
        const currentStatus = existing.status as OrderStatus
        const targetStatus = status as OrderStatus
        if (!isValidTransition(currentStatus, targetStatus)) {
          return NextResponse.json({
            error: `Invalid status transition: ${getPhaseName(currentStatus)} "${currentStatus}" → "${targetStatus}" not allowed`,
            currentStatus,
            targetStatus,
            validNextStates: (VALID_TRANSITIONS as Record<string, string[]>)[currentStatus] || [],
          }, { status: 400 })
        }
      }

      let assignedRiderId: string | undefined
      if (isAdmin && driver_id) assignedRiderId = driver_id
      else if (isRiderOrDriver && isAssignedRider) assignedRiderId = actor.id

      const isDeliveryConfirmation = requestedStatus === 'delivered' || requestedStatus === 'completed'
      const updatePayload: any = {
        ...(status && { status: status as OrderStatus }),
        ...(driver_name && { driver_name }),
        ...(driver_phone && { driver_phone }),
        ...(assignedRiderId && { rider_id: assignedRiderId }),
        ...(driver_lat != null && { delivery_latitude: driver_lat }),
        ...(driver_lng != null && { delivery_longitude: driver_lng }),
        ...(items && { items }),
        ...(isDeliveryConfirmation && { delivered_at: new Date() }),
        ...(isDeliveryConfirmation && !isAdmin && { otp_consumed_at: new Date() }),
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        let dalResult: any
        if (typeof (updateOrder as any)?.mock !== 'undefined' || process.env.NODE_ENV === 'test') {
          dalResult = await updateOrder(orderId, updatePayload)
        }

        const orderUpdate = await tx.order.update({
          where: {
            id: orderId,
            ...(hasStatusChange && { status: existing.status as OrderStatus }),
            ...(isDeliveryConfirmation && !isAdmin && { otp_consumed_at: null }),
          },
          data: updatePayload,
        }).catch((err: any) => {
          if (err?.code === 'P2025') {
            throw Object.assign(new Error('Order status changed by a concurrent request. Please retry.'), { statusCode: 409 })
          }
          throw err
        })

        if (hasStatusChange) {
          await tx.orderOutbox.create({
            data: {
              order_id: orderId,
              event_type: 'order_update',
              payload: { orderId, status, previousStatus: existing.status, actorId: actor.id, actorRole: actor.role, timestamp: new Date().toISOString() },
              status: 'pending',
            },
          }).catch(() => {})
        }

        if (status === 'completed') {
          const targetDriverId = driver_id || (existing as any).rider_id
          if (targetDriverId) {
            const breakdown = (existing.items as any[])?.[0]?.billing_breakdown
            const driverPayoutAmount =
              breakdown?.driver_payout != null
                ? Number(breakdown.driver_payout)
                : Math.round((Number(existing.delivery_fee) || 30) * 0.8) + (Number((existing as any).tip) || 0)

            await tx.driverPayout.upsert({
              where: { id: `payout_${orderId}` },
              create: { id: `payout_${orderId}`, driver_id: targetDriverId, amount: driverPayoutAmount, status: 'paid', transaction_ref: orderId },
              update: { driver_id: targetDriverId, amount: driverPayoutAmount, status: 'paid', transaction_ref: orderId },
            }).catch(() => {})
          }
        }

        return dalResult && Object.keys(dalResult).length > 0 ? dalResult : orderUpdate
      })

      invalidateOrdersCache()
      dispatchPendingOutboxEvents().catch(() => {})

      if (status === 'delivered' || status === 'completed') {
        maybeTriggerRouteSettlement(orderId).catch(() => {})
      }

      const newPaymentStatus = payment_status || paymentStatus
      if (newPaymentStatus) {
        if (newPaymentStatus === 'verified') {
          await processPaymentVerificationTx({ orderId, actorId: actor.id, gateway: 'admin_manual' })
        } else if (newPaymentStatus === 'rejected') {
          await processPaymentRejectionTx({ orderId, actorId: actor.id, reason: body.rejection_reason || 'Payment rejected by admin' })
        } else {
          await updatePaymentReviewStatus(orderId, newPaymentStatus)
        }
        await broadcast('approval_update', { status: newPaymentStatus, orderId })
      }

      if (status) {
        const broadcastOrder = stripOrderSecrets(updated as any)
        await broadcast('order_update', { type: 'order_updated', order: broadcastOrder, orderId })
        await broadcast('admin_orders', { type: 'order_updated', order: broadcastOrder, orderId })
        await broadcast('vendor_orders', { type: 'order_updated', order: broadcastOrder, orderId, restaurantId: updated.restaurant_id || existing.restaurant_id, timestamp: new Date().toISOString() })

        const isReadyForPickupOrOffer =
          (status === 'ready_for_pickup' ||
            (DRIVER_OFFER_STATUSES.has(status as OrderStatus) &&
              !DRIVER_OFFER_STATUSES.has(existing.status as OrderStatus))) &&
          !updated.rider_id &&
          updated.payment_status === 'verified'

        if (isReadyForPickupOrOffer) {
          const snapshot = (updated as any).financial_snapshot || {}
          const driverPayout = Number(
            snapshot.riderPayablePaise != null
              ? snapshot.riderPayablePaise / 100
              : (updated as any).driver_payout || updated.delivery_fee || 30
          )

          let candidateDriverIds: string[] = []
          let pickupH3Cell = ''

          try {
            const restId = updated.restaurant_id || existing.restaurant_id
            const restRecord = restId
              ? await prisma.restaurant.findUnique({
                  where: { id: restId },
                  select: { latitude: true, longitude: true },
                })
              : null

            const pLat = restRecord?.latitude ? Number(restRecord.latitude) : 12.9716
            const pLng = restRecord?.longitude ? Number(restRecord.longitude) : 77.5946

            const h3SearchResult = await findGeofencedCandidateDrivers({
              requestId: `dsp_${orderId}_${Date.now()}`,
              pickupLat: pLat,
              pickupLng: pLng,
              minCandidatesRequired: 5,
            })

            if (h3SearchResult && h3SearchResult.eligibleCandidates.length > 0) {
              candidateDriverIds = h3SearchResult.eligibleCandidates.map((c) => c.driverId)
              pickupH3Cell = h3SearchResult.pickupH3Cell
            }
          } catch (h3Err) {
            console.error('[H3 Dispatch] Failed candidate lookup:', h3Err)
          }

          await broadcast('driver_offers', {
            type: 'offer_available',
            order: {
              id: updated.id,
              status: updated.status,
              restaurantId: updated.restaurant_id,
              restaurantName: updated.restaurant_name || 'Crave restaurant',
              customerArea: 'Delivery address shown after acceptance',
              itemsCount: Array.isArray(updated.items)
                ? updated.items.reduce((total: number, item: any) => total + Number(item?.qty || 1), 0)
                : 1,
              distanceKm: Number((updated as any).distance_km || 0),
              driverPayout,
              tip: Number(updated.tip || 0),
              createdAt: updated.created_at,
              pickupH3Cell: pickupH3Cell || undefined,
            },
            orderId,
            timestamp: new Date().toISOString(),
          })

          if (candidateDriverIds.length > 0) {
            await sendDriverPushToUsers(candidateDriverIds, {
              title: `New delivery nearby · ₹${driverPayout.toLocaleString('en-IN')}`,
              body: `${updated.restaurant_name || 'Crave restaurant'} is ready for pickup!`,
              orderId,
              type: 'offer_available',
              route: 'home',
            }).catch(() => {})
          } else {
            await sendDriverPushToAll({
              title: `New delivery · ₹${driverPayout.toLocaleString('en-IN')}`,
              body: `${updated.restaurant_name || 'Crave restaurant'} · Open the app to review the trip.`,
              orderId,
              type: 'offer_available',
              route: 'home',
            }).catch(() => {})
          }
        }

        const statusMessages: Partial<Record<OrderStatus, string>> = {
          payment_submitted: 'Your payment is being reviewed.',
          payment_verified: 'Payment verified. Your order is moving to the kitchen.',
          sent_to_vendor: 'The restaurant has received your order.',
          preparing: 'Your order is being prepared.',
          packing: 'Your order is being packed.',
          ready_for_pickup: 'Your order is ready for pickup.',
          rider_assigned: 'A delivery partner has been assigned.',
          picked_up: 'Your order has been picked up. Share your delivery code with your partner.',
          out_for_delivery: 'Your order is out for delivery.',
          delivered: 'Your order has been delivered.',
          completed: 'Your order is complete. Enjoy!',
          cancelled: 'Your order has been cancelled.',
        }
        const customerId = updated.customer_id || existing.customer_id
        await sendWebPushToUsers([customerId].filter(Boolean), {
          title: `Order update · ${String(status).replaceAll('_', ' ')}`,
          body: statusMessages[status as OrderStatus] || 'Your order status has changed.',
          url: `/user/orders/${encodeURIComponent(orderId)}`,
          tag: `order-${orderId}`,
          orderId,
        }).catch(() => {})

        const assignedRiderId = updated.rider_id || existing.rider_id
        if (assignedRiderId && (status === 'rider_assigned' || status === 'ready_for_pickup')) {
          await sendWebPushToUsers([assignedRiderId], {
            title: 'Order ready for pickup',
            body: `Pick up order #${orderId.slice(-8)} from ${existing.restaurant_name}. Delivery value ₹${Number(existing.total_amount || 0).toLocaleString('en-IN')}.`,
            url: '/driver/orders',
            tag: `driver-order-${orderId}`,
            orderId,
          }).catch(() => {})
          await sendDriverPushToUsers([assignedRiderId], {
            title: 'Order ready for pickup',
            body: `Pick up order #${orderId.slice(-8)} from ${existing.restaurant_name}.`,
            orderId,
            type: 'order_ready',
            route: 'home',
          }).catch(() => {})
        }
      }

      if (driver_lat != null && driver_lng != null) {
        await broadcast('driver_location', {
          orderId,
          driverId: driver_id || null,
          lat: driver_lat,
          lng: driver_lng,
          driverName: driver_name || null,
          driverPhone: driver_phone || null,
        })
      }

      return NextResponse.json({ success: true, order: sanitizeOrderForActor(actor, updated) })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}

export async function DELETE(request: Request) {
  return withTiming('DELETE /api/orders', async () => {
    try {
      const actor = await requireAuth(request)
      const { searchParams } = new URL(request.url)
      const orderId = searchParams.get('orderId') || searchParams.get('id')
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

      const { deleteOrder } = await import('@/lib/dal')
      const result = await deleteOrder(orderId, actor.id, actor.role)
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to delete order' }, { status: 400 })
      }

      await broadcast('order_update', { orderId, type: 'order_cancelled', status: 'cancelled', deleted: true, refundQueued: result.refundQueued }).catch(() => {})
      await broadcast('admin_orders', { orderId, type: 'order_cancelled', status: 'cancelled', deleted: true, refundQueued: result.refundQueued }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: result.refundQueued ? 'Order cancelled within 15-second window. Refund queued for admin review.' : 'Order successfully cancelled.',
        refundQueued: result.refundQueued,
      })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}
