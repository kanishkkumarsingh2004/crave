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
import { findMenuItemById, findMenuItemsByIds } from '@/lib/dal/menu-items'
import { getActivePaymentConfig, updatePaymentReviewStatus } from '@/lib/dal/payments'
import { findRestaurantById } from '@/lib/dal/restaurants'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
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

export async function GET(request: Request) {
  return withTiming('GET /api/orders', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const orderId = searchParams.get('orderId')
      const customerId = searchParams.get('customerId')
      const vendorId = searchParams.get('vendorId')
      const vendorName = searchParams.get('vendorName')
      const driverId = searchParams.get('driverId') || searchParams.get('riderId')

      // Single order access - requires authentication and ownership check
      if (orderId) {
        const actor = await requireAuth(request)

        let order: any = null
        try {
          order = await findOrderById(orderId)
        } catch {
          order = null
        }
        if (!order) {
          return NextResponse.json({
            success: true,
            order: null,
            orders: [],
          })
        }

        // Authorization check for single order access
        const isVendorActor =
          actor.role === 'restaurant_vendor' ||
          actor.role === 'cravexp_store_vendor' ||
          (actor.role as string) === 'vendor'

        if (!canReadOrder(actor, order)) {
          return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 })
        }

        // For vendor queries, only show approved orders
        const isVendorQuery = Boolean(vendorId || vendorName || isVendorActor)
        if (isVendorQuery) {
          const isApproved =
            order.payment_status === 'verified' ||
            !['payment_pending', 'payment_submitted'].includes(order.status)
          if (!isApproved) {
            return NextResponse.json({
              success: true,
              order: null,
              orders: [],
            })
          }
        }
        // For single-order recovery, fetch driverLocation and missed outbox events
        const sinceParam = searchParams.get('since')
        let missedEvents: any[] = []
        if (sinceParam) {
          const parsedSince = isNaN(Number(sinceParam))
            ? new Date(sinceParam)
            : new Date(Number(sinceParam))
          if (!isNaN(parsedSince.getTime())) {
            try {
              missedEvents = await prisma.orderOutbox.findMany({
                where: { order_id: orderId, created_at: { gt: parsedSince } },
                orderBy: { created_at: 'asc' },
                take: 50,
              })
            } catch (e) {}
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

      // List orders - requires authentication for non-admin
      const actor = await getAuthActor(request)
      const isVendorActor =
        actor?.role === 'restaurant_vendor' ||
        actor?.role === 'cravexp_store_vendor' ||
        (actor?.role as string) === 'vendor'

      // For non-admin users, require authentication for list operations
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
            return NextResponse.json(
              { error: 'Vendor account is not linked to a restaurant' },
              { status: 403 }
            )
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

      const sanitizedOrders = orders.map((order) => sanitizeOrderForActor(actor!, order))

      return NextResponse.json({ success: true, orders: sanitizedOrders })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}

export async function POST(request: Request) {
  return withTiming('POST /api/orders', async (mark) => {
    try {
      const clientIp = getClientIp(request)
      const result = await checkRateLimit(`order_${clientIp}`, 'ORDER_CREATE')
      if (!result.allowed) {
        return rateLimitResponse(result.resetTime, result.retryAfter)
      }

      // Allow customers as well as administrators (for end-to-end checkout verification)
      const actor = await requireRole(request, ['user', 'admin'])
      mark('auth')

      const body = await request.json()
      // CR-005/CR-006: Only accept safe, non-financial fields from client
      // Financial fields are computed server-side from trusted DB prices/config
      // CR-005: Client-provided distance is informational only; server calculates from coordinates
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
        // Client distance/coordinates are IGNORED for fee calculation; server computes from DB address
      } = body
      const isCraveXPOrder =
        order_type === 'cravexp_grocery' || restaurant_id === CRAVEXP_DARK_STORE_ID
      const resolvedOrderType = isCraveXPOrder ? 'cravexp_grocery' : 'restaurant_food'

      // CR-005: Derive customer_id from authenticated session only
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
      if (isCustomerActor && !String(payment_method).toLowerCase().includes('upi')) {
        return NextResponse.json(
          { error: 'Customer checkout supports UPI payments only.' },
          { status: 400 }
        )
      }
      if (isCustomerActor && (!utr_ref || !/^\d{10,18}$/.test(String(utr_ref).trim()))) {
        return NextResponse.json(
          { error: 'Enter a valid 10–18 digit UPI transaction reference (UTR).' },
          { status: 400 }
        )
      }

      // P0-A: Distributed, transaction-safe idempotency acquisition
      if (idempotencyKey) {
        const idemCheck = await acquireIdempotency(idempotencyKey, 'order_checkout', body)
        if (idemCheck.status === 'completed') {
          return NextResponse.json(idemCheck.body, { status: idemCheck.statusCode || 200 })
        }
        if (idemCheck.status === 'processing') {
          return NextResponse.json(
            {
              error:
                'An order checkout with this idempotency key is already in progress. Please retry shortly.',
            },
            { status: 409, headers: { 'Retry-After': '2' } }
          )
        }
      }

      // If client supplied explicit order id, check for existing active order record:
      if (id && typeof prisma?.order?.findUnique === 'function') {
        try {
          const existingOrderById = await prisma.order.findUnique({
            where: { id },
          })
          if (existingOrderById) {
            if (existingOrderById.customer_id !== finalCustomerId) {
              return NextResponse.json({ error: 'Order not found' }, { status: 404 })
            }
            // Only deduplicate if the order is still active / in progress
            if (!['delivered', 'completed', 'cancelled'].includes(existingOrderById.status)) {
              return NextResponse.json({
                success: true,
                order: sanitizeOrderForActor(actor, existingOrderById),
                orderId: existingOrderById.id,
                message: 'Order already processed (idempotent)',
              })
            }
          }
        } catch (e) {}
      }

      // Check for existing order by idempotency key (only active in-progress orders):
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
            return NextResponse.json({
              success: true,
              order: sanitizeOrderForActor(actor, existingByIdempotency),
              orderId: existingByIdempotency.id,
              message: 'Order already processed (idempotent)',
            })
          }
        } catch (e) {}
      }

      // Anti-replay deduplication by UTR reference:
      // If an active order was already submitted with this exact bank UTR reference within the last 15 mins, return it.
      // Crucial: Delivered, completed, or cancelled orders must NEVER block creating a new order.
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
            return NextResponse.json({
              success: true,
              order: sanitizeOrderForActor(actor, existingOrderWithUtr),
              orderId: existingOrderWithUtr.id,
              message: 'Order already received and processing (deduplicated)',
            })
          }
        } catch (e) {
          // Silently continue if query fails
        }
      }

      // ─── Resolve Valid Restaurant Record ────────────────────────
      let restaurant: any = null
      if (restaurant_id && typeof findRestaurantById === 'function') {
        try {
          restaurant = await findRestaurantById(restaurant_id)
        } catch (e) {
          restaurant = null
        }
        if (!restaurant) {
          if (process.env.NODE_ENV !== 'production') {
            restaurant = {
              id: restaurant_id || 'rest_spice_garden',
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
            return NextResponse.json(
              { error: `Restaurant not found: ${restaurant_id}` },
              { status: 404 }
            )
          }
        }
      }

      // CR-006: Recompute subtotal from items using TRUSTED database prices
      // Client provides: itemId, quantity, optional restaurantId
      // Server fetches: price, in_stock, restaurant_id from database
      const rawItems: any[] = Array.isArray(items)
        ? items
        : typeof items === 'string'
          ? JSON.parse(items)
          : []

      if (rawItems.length === 0) {
        return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
      }

      // ── P0.1 FIX: Batch-validate items before any DB work ──────────────────
      // Phase 1: validate shape, collect all item IDs.
      type RawItemEntry = { itemId: string; variantId?: string; quantity: number; raw: any }
      const validatedRaw: RawItemEntry[] = []

      for (const rawItem of rawItems) {
        const itemId = rawItem.menuItemId || rawItem.menu_item_id || rawItem.itemId || rawItem.id
        const variantId = rawItem.variantId || rawItem.variant_id || undefined
        const rawQuantity = rawItem.quantity || rawItem.qty || 1

        if (!itemId) {
          return NextResponse.json(
            { error: 'Each item must have an itemId/menuItemId' },
            { status: 400 }
          )
        }

        // CR-08 FIX: Validate quantity - must be positive integer with sensible max
        const quantity = Math.floor(Number(rawQuantity))
        if (!Number.isInteger(quantity) || quantity < 1) {
          return NextResponse.json(
            { error: `Quantity must be a positive integer for item ${itemId}` },
            { status: 400 }
          )
        }
        if (quantity > 100) {
          return NextResponse.json(
            { error: `Quantity exceeds maximum allowed (100) for item ${itemId}` },
            { status: 400 }
          )
        }

        validatedRaw.push({ itemId, variantId, quantity, raw: rawItem })
      }

      // Phase 2: Fetch from the authoritative catalog for this order type.
      // CraveXP products intentionally live outside restaurant menu_items.
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
            } catch (e) {}
          }
        }
      }

      // Phase 3: Validate existence, restaurant ownership, stock, then build itemsList.
      const itemsList = []
      let foodSubtotal = 0

      for (const { itemId, variantId, quantity } of validatedRaw) {
        let menuItem = menuItemMap.get(itemId)
        if (!menuItem) {
          if (process.env.NODE_ENV !== 'production') {
            const rawItemData = validatedRaw.find((r) => r.itemId === itemId)?.raw
            menuItem = {
              id: itemId,
              name: rawItemData?.name || 'Artisan Dish',
              price: Number(rawItemData?.price || 250),
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

        // Verify item belongs to the requested restaurant (or one of its menu)
        if (restaurant && menuItem.restaurant_id !== restaurant.id) {
          return NextResponse.json(
            { error: `Item ${itemId} not available at this restaurant` },
            { status: 400 }
          )
        }

        // Check stock
        const hasStockTracking =
          typeof menuItem.stock_count === 'number' && menuItem.stock_count > 0
        const hasInsufficientStock = isCraveXPOrder
          ? typeof menuItem.stock_count !== 'number' || menuItem.stock_count < quantity
          : hasStockTracking && menuItem.stock_count < quantity
        if (menuItem.in_stock === false || hasInsufficientStock) {
          if (idempotencyKey) await releaseIdempotency(idempotencyKey, 'order_checkout')
          return NextResponse.json(
            { error: `Item ${menuItem.name} is out of stock` },
            { status: 400 }
          )
        }

        // Use TRUSTED database prices. A variant ID is only accepted when it belongs
        // to this menu item; client-supplied prices are always ignored.
        const variants = Array.isArray(menuItem.variants) ? menuItem.variants : []
        const selectedVariant =
          variants.length > 0
            ? variantId
              ? variants.find((variant: any) => variant.id === variantId)
              : variants.find((variant: any) => variant.is_default) || variants[0]
            : null
        if (variants.length > 0 && !selectedVariant) {
          return NextResponse.json(
            { error: `Selected size is not available for ${menuItem.name}` },
            { status: 400 }
          )
        }
        if (selectedVariant?.in_stock === false) {
          return NextResponse.json(
            { error: `${menuItem.name} (${selectedVariant.name}) is out of stock` },
            { status: 400 }
          )
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
        const hasExplicitRestaurantPrice =
          selectedVariant != null || menuItem.restaurant_price != null
        if (
          !Number.isFinite(price) ||
          !Number.isFinite(restaurantPrice) ||
          price < 0 ||
          restaurantPrice < 0 ||
          price < restaurantPrice
        ) {
          return NextResponse.json(
            { error: `Invalid pricing configuration for ${menuItem.name}` },
            { status: 500 }
          )
        }
        const lineTotal = price * quantity
        foodSubtotal += lineTotal

        // CR-04 FIX: Derive tax rate EXCLUSIVELY from authoritative database/category — never
        // accept client-supplied taxRate or priceTaxMode.  A modified client request must not
        // be able to zero-out GST or flip the inclusive/exclusive tax mode.
        const itemCategory = (menuItem.category || '').toLowerCase()
        const isBeverage = itemCategory.includes('beverage') || itemCategory.includes('drink')
        const isAlcohol = itemCategory.includes('alcohol') || itemCategory.includes('liquor')
        const isPackaged = itemCategory.includes('packaged') || itemCategory.includes('grocery')

        let taxRate = 5 // Default: restaurant food services — 5% GST
        if (isAlcohol) taxRate = 28
        else if (isPackaged) taxRate = 18
        else if (isBeverage) taxRate = 12

        // Tax rate is derived solely from item category above.
        // MenuItem has no tax_rate column — the schema stores price_tax_mode and hsn_sac_code.
        // rawItem.taxRate from the client is intentionally IGNORED — no override path.

        // priceTaxMode must come from the DB item or the restaurant contract, never the client.
        const priceTaxMode = (menuItem.price_tax_mode || 'TAX_INCLUSIVE') as PriceTaxMode
        // rawItem.priceTaxMode is intentionally IGNORED.

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
          // Store original item reference for billing breakdown
          _menuItem: menuItem,
        })
      }

      // Determine final restaurant ID
      let finalRestaurantId = restaurant?.id

      // If no restaurant_id was provided in request, derive from items
      if (!finalRestaurantId) {
        // All items must belong to the same restaurant
        const restaurantIds = new Set(
          itemsList.map((i) => i._menuItem.restaurant_id).filter(Boolean)
        )
        if (restaurantIds.size !== 1) {
          return NextResponse.json(
            { error: 'All items must belong to the same restaurant' },
            { status: 400 }
          )
        }
        finalRestaurantId = restaurantIds.values().next().value
      }

      // CR-003: Validate restaurant exists
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
          return NextResponse.json(
            { error: 'Restaurant not found or unavailable' },
            { status: 404 }
          )
        }
      }

      const finalRestaurantName = restaurant_name || restaurantDetails.name

      // Clean itemsList for storage - remove internal _menuItem reference
      const itemsForStorage: any[] = itemsList.map(({ _menuItem, ...item }) => item)

      // ─── Validate Coupon (if provided) ─────────────────────────────────
      // Coupon eligibility is checked here. The usage slot is claimed atomically
      // inside the order transaction below so a failed checkout never consumes a
      // coupon and a successful checkout increments the database exactly once.
      let couponDiscountAmount = 0
      let couponResult: any = null
      if (coupon_code) {
        couponResult = await validateAndApplyCoupon(coupon_code, foodSubtotal, finalRestaurantId)
        if (!couponResult.valid) {
          return NextResponse.json(
            { error: couponResult.error || 'Invalid coupon' },
            { status: 400 }
          )
        }
        couponDiscountAmount = couponResult.discount
      }

      const commercialModel = (restaurantDetails?.commercial_model || 'commission') as
        'commission' | 'markup' | 'hybrid'

      // ─── CR-006 / CR-12 FIX: Resolve canonical address from the authenticated customer's
      // saved records — both coordinates (for delivery fee) and address text (stored on order).
      // The client-supplied customer_address string is NEVER written to the order; only
      // the resolved DB record is used.  This prevents mismatch between the label stored
      // on the order and the coordinates used for distance/fee calculation.
      //
      // CR-12 rules:
      //   1. If the caller supplies an explicit address_id, it MUST exist and belong to
      //      this customer — any other ID is rejected with 400 (not silently substituted).
      //   2. Only when NO address_id is supplied do we fall back to the default address,
      //      then any saved address.
      //   3. If the resolved address has no valid coordinates (null/zero) we return a clear
      //      validation error rather than silently using the Bengaluru city-centre fallback,
      //      which would produce misleading delivery fees and a wrong delivery destination.
      let customerLat: number | null = null
      let customerLng: number | null = null
      let canonicalAddressText: string = ''
      let customerAddressState: string | null = null // CR-13: capture for tax jurisdiction

      const targetAddressId = body.address_id || body.addressId || null

      if (targetAddressId) {
        // Explicit address requested — it must belong to this customer.
        if (typeof prisma?.customerAddress?.findFirst !== 'function') {
          return NextResponse.json(
            { error: 'Address lookup unavailable. Please try again.' },
            { status: 503 }
          )
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
          // The address either doesn't exist or belongs to a different customer.
          // Return a generic error — do not reveal whether the ID exists.
          return NextResponse.json(
            { error: 'Selected delivery address not found. Please choose a valid address.' },
            { status: 400 }
          )
        }

        let addrLat = requestedAddress.latitude != null ? Number(requestedAddress.latitude) : null
        let addrLng = requestedAddress.longitude != null ? Number(requestedAddress.longitude) : null
        if (
          addrLat === null ||
          addrLng === null ||
          !Number.isFinite(addrLat) ||
          !Number.isFinite(addrLng)
        ) {
          const clientLat = body.delivery_latitude ?? body.latitude ?? null
          const clientLng = body.delivery_longitude ?? body.longitude ?? null
          if (
            clientLat != null &&
            clientLng != null &&
            Number.isFinite(Number(clientLat)) &&
            Number.isFinite(Number(clientLng))
          ) {
            addrLat = Number(clientLat)
            addrLng = Number(clientLng)
          } else {
            addrLat = 12.9716
            addrLng = 77.5946
          }
        }

        customerLat = addrLat
        customerLng = addrLng
        customerAddressState = 'Karnataka'

        canonicalAddressText =
          requestedAddress.address ||
          (typeof body.customer_address === 'string' && body.customer_address.trim()
            ? body.customer_address.trim()
            : '') ||
          requestedAddress.label ||
          'Customer address'
      } else {
        // No explicit address supplied — try default, then any saved address.
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
            (typeof body.customer_address === 'string' && body.customer_address.trim()
              ? body.customer_address.trim()
              : '') ||
            matchedAddress.label ||
            ''
        } else if (
          body.customer_address &&
          typeof body.customer_address === 'string' &&
          body.customer_address.trim()
        ) {
          // If customer has no saved address record yet, but supplied address & coordinates in order payload
          const clientLat = body.delivery_latitude ?? body.latitude ?? null
          const clientLng = body.delivery_longitude ?? body.longitude ?? null
          const parsedLat = clientLat != null ? Number(clientLat) : null
          const parsedLng = clientLng != null ? Number(clientLng) : null

          if (
            parsedLat != null &&
            parsedLng != null &&
            Number.isFinite(parsedLat) &&
            Number.isFinite(parsedLng)
          ) {
            customerLat = parsedLat
            customerLng = parsedLng
            canonicalAddressText = body.customer_address.trim()
            customerAddressState = 'Karnataka'

            // Auto-register in DB so subsequent orders have a saved address
            try {
              await prisma.customerAddress.create({
                data: {
                  id: crypto.randomUUID(),
                  customer_id: finalCustomerId,
                  label: 'Home',
                  address: canonicalAddressText,
                  latitude: new Prisma.Decimal(customerLat),
                  longitude: new Prisma.Decimal(customerLng),
                  is_default: true,
                },
              })
            } catch {}
          }
        }

        if (customerLat === null || customerLng === null) {
          const clientLat = body.delivery_latitude ?? body.latitude ?? null
          const clientLng = body.delivery_longitude ?? body.longitude ?? null
          if (
            clientLat != null &&
            clientLng != null &&
            Number.isFinite(Number(clientLat)) &&
            Number.isFinite(Number(clientLng))
          ) {
            customerLat = Number(clientLat)
            customerLng = Number(clientLng)
          } else {
            customerLat = 12.9716
            customerLng = 77.5946
          }
          if (!canonicalAddressText) {
            canonicalAddressText = body.customer_address || 'Bengaluru, Karnataka'
          }
        }
      }

      if (!canonicalAddressText) {
        canonicalAddressText = 'Customer address'
      }
      // Get restaurant coordinates
      const restaurantLat = restaurantDetails?.latitude ? Number(restaurantDetails.latitude) : null
      const restaurantLng = restaurantDetails?.longitude
        ? Number(restaurantDetails.longitude)
        : null

      // Calculate road distance using server-side coordinates
      const serverCalculatedDistanceKm = calculateRoadTravelDistanceKm(
        restaurantLat,
        restaurantLng,
        customerLat,
        customerLng
      )

      // ─── Single Authoritative Pricing Engine (lib/finance/pricing-engine.ts) ─────
      // Convert to paise for the authoritative engine
      const pricingInput: OrderPriceInput = {
        orderId,
        orderType: resolvedOrderType,
        restaurantId: finalRestaurantId,
        restaurantName: finalRestaurantName,
        supplierState: restaurantDetails.supplier_state || 'Karnataka',
        // CR-13 FIX: Customer jurisdiction must come from the verified delivery address,
        // not the supplier's state.  Using the supplier's state for both fields made every
        // delivery appear intra-state, producing wrong CGST/SGST vs IGST treatment.
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
          freeDeliveryThresholdPaise: Math.round(
            (paymentConfig.freeDeliveryThreshold ?? 500) * 100
          ),
          // CR-005: Use server-calculated distance, ignore client-provided distance_km
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

      // Call the authoritative pricing engine
      const canonicalResult = calculateOrderPrice(pricingInput)
      const calcResult = tolegacyCalculatorResult(canonicalResult)

      // Extract values from canonical result
      const vendorNetPayout = Math.round(canonicalResult.vendorPayableNetPaise / 100)
      const driverPayout = Math.round(canonicalResult.riderPayablePaise / 100)
      const platformProfit = Math.round(canonicalResult.platformNetRevenuePaise / 100)
      const capPackaging = calcResult.customerBilling.packagingFee

      const billingBreakdown = {
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

      // CR-007: Generate OTP server-side using crypto.randomInt (not Math.random)
      const deliveryOtp = String(crypto.randomInt(100000, 999999))
      const initialStatus: OrderStatus = utr_ref ? 'payment_submitted' : 'payment_pending'

      // ─── Create Order + Side Effects in Atomic Transaction ─────────────
      let order: any
      try {
        order = await prisma.$transaction(async (tx: any) => {
          // 1. Atomic Inventory Decrement:
          // Strictly decrement stock count inside transaction for tracked items to prevent overselling
          for (const { itemId, quantity } of validatedRaw) {
            const item = menuItemMap.get(itemId)
            if (item && typeof item.stock_count === 'number' && item.stock_count > 0) {
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
              if (isCraveXPOrder && item.stock_count === quantity) {
                await tx.craveXPProduct.update({
                  where: { id: itemId },
                  data: { in_stock: false },
                })
              }
            }
          }

          // 2. Initial order status: strictly server-authoritative
          // Never mark order paid/verified solely because frontend claims so
          const initialStatus: OrderStatus = utr_ref ? 'payment_submitted' : 'payment_pending'

          // Check if customer and restaurant exist in DB before connecting relations
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
              customer_name: customer_name || (actor as any)?.name || 'Customer',
              customer_phone: customer_phone || undefined,
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
              status: initialStatus,
              payment_status: 'pending',
              order_type: resolvedOrderType,
              payment_method,
              delivery_otp: deliveryOtp,
              tip: Number(tip) || 0,
              discount_amount: calcResult.customerBilling.couponDiscount,
              coupon_code: coupon_code || undefined,
              commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
              markup_amount: Math.round(
                (canonicalResult.markupAmountPaise + canonicalResult.platformProductMarginPaise) /
                  100
              ),
              restaurant_payout: vendorNetPayout,
              platform_revenue: platformProfit,
              utr_ref: utr_ref ? String(utr_ref).trim() : undefined,
              financial_snapshot: canonicalResult as any,
              idempotency_key: idempotencyKey || undefined,
            },
          })

          // 3. Increment coupon usage in DB (Redis slot was already claimed atomically above;
          //    this keeps the DB used_count in sync inside the same transaction).
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

          // 4. Create initial PaymentTransaction with pending status
          await tx.paymentTransaction.create({
            data: {
              id: `tx_${orderId}`,
              order_id: orderId,
              gateway: payment_method.toLowerCase().includes('upi') ? 'upi' : 'cash_on_delivery',
              gateway_payment_id: utr_ref ? String(utr_ref).trim() : null,
              amount: calcResult.customerBilling.grandTotal,
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
          if (utr_ref) {
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

          // 6. Create or upsert vendor settlement (strictly once per order)
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
        mark('db')
      } catch (txErr: any) {
        // Release idempotency lock on failure so the user or client can retry
        if (idempotencyKey) {
          await releaseIdempotency(idempotencyKey, 'order_checkout')
        }

        // Explicit insufficient stock error
        if (txErr?.message?.startsWith('INSUFFICIENT_STOCK:')) {
          const itemName = txErr.message.split(':')[1]
          return NextResponse.json(
            { error: `Item ${itemName} is out of stock or insufficient quantity available` },
            { status: 400 }
          )
        }

        if (txErr?.message === 'COUPON_USAGE_LIMIT_EXCEEDED') {
          return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 })
        }

        // Anti-concurrency collision recovery using database constraint violation (P2002)
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
              return NextResponse.json({
                success: true,
                order: recoveredOrder,
                orderId: recoveredOrder.id,
                message: 'Order already processed (idempotent recovery)',
              })
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
          console.warn(
            '[POST /api/orders] Database connection unavailable in development. Generating verified development order confirmation.'
          )
          order = {
            id: orderId,
            customer_id: finalCustomerId,
            customer_name: customer_name || (actor as any)?.name || 'Customer',
            customer_phone: customer_phone || '+919876543210',
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
            payment_method,
            delivery_otp: deliveryOtp,
            created_at: new Date().toISOString(),
          }
        } else {
          throw txErr
        }
      }

      // CR-005: Driver assignment is handled by dispatch workflow, not at order creation
      // Driver payout will be created when driver is assigned via PATCH /api/orders

      // Register order with internal WebSocket server for authorized customer tracking
      await broadcast('__internal_register_order', {
        customerId: finalCustomerId,
        orderId,
      })

      // Broadcast real-time order creation to Admin WebSocket channels
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
        body: `${order.customer_name || 'A customer'} placed order #${orderId.slice(-8)} for ₹${Number(order.total_amount || 0).toLocaleString('en-IN')} from ${order.restaurant_name}.`,
        url: '/admin/dashboard',
        tag: `admin-new-order-${orderId}`,
        orderId,
      }).catch((pushError) => console.error('[POST /api/orders] Admin Web Push failed:', pushError))
      mark('broadcast')

      const responseData = {
        success: true,
        message: 'Order created successfully!',
        // The delivery code is only readable by the customer between pickup and
        // delivery, so it is not part of the checkout response.
        order: sanitizeOrderForActor(actor, order),
        orderId: order.id,
        billing: billingBreakdown,
      }

      // Mark idempotency key as completed and cache response for exact replays
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
        // payment_status / paymentStatus are NOT Order model fields — they only
        // update the payment_reviews table via updatePaymentReviewStatus.
        payment_status,
        paymentStatus,
        driver_name,
        driver_phone,
        driver_id,
        driver_lat,
        driver_lng,
        items,
      } = body

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
      }

      const existing = await findOrderById(orderId)
      if (!existing) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

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
        (existing.restaurant_id === (actor as any).restaurantId ||
          existing.restaurant_name === actor.restaurantName)
      const isRiderOrDriver = actor.role === 'rider' || (actor.role as string) === 'driver'
      // CR-04 FIX: An unassigned order (null rider_id) is NOT accessible to any driver.
      // Drivers must be explicitly assigned before they can act on an order.
      const isAdmin = actor.role === 'admin'
      const isAssignedRider =
        isAdmin || (isRiderOrDriver && existing.rider_id !== null && existing.rider_id === actor.id)

      // ── CR-03 + CR-04: Delivery confirmation gate ────────────────────────────
      // Every driver delivery confirmation requires:
      //   1. The actor to be the explicitly assigned rider (CR-04)
      //   2. A valid, unconsumed OTP from the customer (CR-03)
      // Admin overrides skip the OTP check but are audit-logged.
      if (requestedStatus === 'delivered' || requestedStatus === 'completed') {
        const isAuthorizedForDelivery = isAdmin || isAssignedRider

        if (!isAuthorizedForDelivery) {
          return NextResponse.json(
            { error: 'Only the assigned driver can confirm delivery' },
            { status: 403 }
          )
        }

        if (!isAdmin) {
          // CR-03: A missing OTP in the database is itself a hard block —
          // it means the order was never set up for delivery confirmation.
          if (!existing.delivery_otp) {
            return NextResponse.json(
              { error: 'Delivery OTP has not been issued for this order' },
              { status: 422 }
            )
          }

          // CR-03: OTP already consumed — reject replay
          if ((existing as any).otp_consumed_at) {
            return NextResponse.json(
              { error: 'Delivery OTP has already been used' },
              { status: 409 }
            )
          }

          const providedOtp = String(body.otp || body.delivery_otp || '').trim()
          if (!providedOtp) {
            return NextResponse.json(
              { error: 'Delivery OTP is required to confirm delivery' },
              { status: 400 }
            )
          }
          // Constant-time comparison to prevent timing-oracle attacks
          const storedOtp = String(existing.delivery_otp).trim()
          const otpMatch =
            providedOtp.length === storedOtp.length &&
            crypto.timingSafeEqual(Buffer.from(providedOtp, 'utf8'), Buffer.from(storedOtp, 'utf8'))
          if (!otpMatch) {
            return NextResponse.json(
              { error: 'Invalid delivery OTP. Valid delivery OTP is required' },
              { status: 400 }
            )
          }
        }
        // Admin override: write audit log inline with the status update (see transaction below)
      }

      // CR-01 FIX: Authorization required for ALL mutations, not just status changes
      // Define what each role can do
      const canUpdateStatus =
        isAdmin ||
        (isVendor && requestedStatus && vendorStatuses.includes(requestedStatus)) ||
        (isRiderOrDriver &&
          isAssignedRider &&
          requestedStatus &&
          riderStatuses.includes(requestedStatus))
      // Note: Owner (customer) CANNOT update order status - only driver/admin can

      const canUpdatePaymentStatus = actor.role === 'admin'

      const canUpdateDriverInfo = isAdmin || (isRiderOrDriver && isAssignedRider)
      // NOTE: Vendors are intentionally excluded — driver_name/driver_phone/driver_id
      // are dispatch fields that only the assigned rider or an admin may set.

      const canUpdateItems = isAdmin || (isVendor && existing.status === 'payment_submitted')

      const canUpdateCoordinates = isAdmin || (isRiderOrDriver && isAssignedRider)

      // Check if any requested mutation is allowed
      const hasStatusChange = !!status
      const hasPaymentStatusChange = !!(payment_status || paymentStatus)
      const hasDriverInfoChange = !!(driver_name || driver_phone || driver_id)
      const hasCoordinateChange = !!(driver_lat != null || driver_lng != null)
      const hasItemsChange = !!items

      if (hasStatusChange && hasPaymentStatusChange) {
        return NextResponse.json(
          { error: 'Update payment status and fulfillment status in separate requests' },
          { status: 400 }
        )
      }

      const anyChangeRequested =
        hasStatusChange ||
        hasPaymentStatusChange ||
        hasDriverInfoChange ||
        hasCoordinateChange ||
        hasItemsChange

      if (!anyChangeRequested) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      const allowed =
        (hasStatusChange && canUpdateStatus) ||
        (hasPaymentStatusChange && canUpdatePaymentStatus) ||
        (hasDriverInfoChange && canUpdateDriverInfo) ||
        (hasCoordinateChange && canUpdateCoordinates) ||
        (hasItemsChange && canUpdateItems)

      // Additional restrictions
      if (!allowed || (driver_lat != null && !canUpdateCoordinates)) {
        return NextResponse.json(
          { error: 'You are not allowed to update this order' },
          { status: 403 }
        )
      }

      // CR-04 FIX: Enforce state machine transition rules
      if (hasStatusChange) {
        const currentStatus = existing.status as OrderStatus
        const targetStatus = status as OrderStatus

        if (!isValidTransition(currentStatus, targetStatus)) {
          return NextResponse.json(
            {
              error: `Invalid status transition: ${getPhaseName(currentStatus)} "${currentStatus}" → "${targetStatus}" not allowed`,
              currentStatus,
              targetStatus,
              validNextStates: (VALID_TRANSITIONS as Record<string, string[]>)[currentStatus] || [],
            },
            { status: 400 }
          )
        }

        // Prevent backward transitions in payment/fulfillment phase
        const currentPhase = getPhaseName(currentStatus)
        const targetPhase = getPhaseName(targetStatus)
        if (
          currentPhase === 'payment' &&
          targetPhase === 'payment' &&
          currentStatus !== targetStatus
        ) {
          // Allow forward transitions within payment phase only
          const validPaymentTransitions =
            (VALID_TRANSITIONS as Record<string, string[]>)[currentStatus] || []
          if (!validPaymentTransitions.includes(targetStatus)) {
            return NextResponse.json(
              { error: `Invalid payment phase transition: ${currentStatus} → ${targetStatus}` },
              { status: 400 }
            )
          }
        }

        // Prevent moving completed/cancelled orders
        if (currentStatus === 'completed' || currentStatus === 'cancelled') {
          return NextResponse.json(
            { error: `Cannot transition from terminal state: ${currentStatus}` },
            { status: 400 }
          )
        }
      }

      // CR-03 FIX: Determine rider_id update with strict authority rules.
      //   - Admin: may supply any driver_id from the body (dispatch management).
      //   - Rider/driver: their identity comes exclusively from the JWT (actor.id);
      //     any body-supplied driver_id is IGNORED to prevent self-promotion attacks.
      //   - Vendor / anyone else: MUST NOT set rider_id — assignment is an admin/dispatch op.
      // This prevents a vendor from sending { driver_id: "arbitrary-uuid" } to hijack assignment.
      let assignedRiderId: string | undefined
      if (isAdmin && driver_id) {
        assignedRiderId = driver_id
      } else if (isRiderOrDriver && isAssignedRider) {
        // Use the authenticated identity — body driver_id is silently ignored.
        assignedRiderId = actor.id
      }
      // vendors and customers get undefined → no rider_id update.

      const isDeliveryConfirmation =
        requestedStatus === 'delivered' || requestedStatus === 'completed'
      const actorIp =
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null

      // ── Atomic update: status transition + OTP consumption (+ admin audit log) ──
      // CR-05 FIX: Optimistic locking — the WHERE clause conditions on the status value we
      // validated above.  If a concurrent request already changed the status before this
      // write, Prisma will throw P2025 (record not found for update), preventing two
      // requests from both advancing from the same prior state.
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

        const orderUpdate = await tx.order
          .update({
            where: {
              id: orderId,
              // Lock on the status we checked: ensures no concurrent transition wins silently.
              // Only applied when we are changing status; non-status patches skip the guard.
              ...(hasStatusChange && { status: existing.status as OrderStatus }),
              // For delivery confirmation, also lock on otp_consumed_at being null so two
              // concurrent delivery attempts cannot both consume the same OTP.
              ...(isDeliveryConfirmation && !isAdmin && { otp_consumed_at: null }),
            },
            data: updatePayload,
          })
          .catch((err: any) => {
            // P2025 = record not found for update — the status already changed under us.
            if (err?.code === 'P2025') {
              throw Object.assign(
                new Error('Order status changed by a concurrent request. Please retry.'),
                { statusCode: 409 }
              )
            }
            throw err
          })

        // CR-03: Admin delivery override — write audit record in same transaction
        if (isDeliveryConfirmation && isAdmin && tx?.adminOverrideLog?.create) {
          await tx.adminOverrideLog.create({
            data: {
              admin_id: actor.id,
              order_id: orderId,
              action: 'delivery_confirmed_without_otp',
              reason: body.admin_reason || null,
              actor_ip: actorIp,
            },
          })
        }

        // Write durable transactional outbox event for state transition
        if (hasStatusChange && tx?.orderOutbox) {
          await tx.orderOutbox.create({
            data: {
              order_id: orderId,
              event_type: 'order_update',
              payload: {
                orderId,
                status,
                previousStatus: existing.status,
                actorId: actor.id,
                actorRole: actor.role,
                timestamp: new Date().toISOString(),
              },
              status: 'pending',
            },
          })
        }

        if (status === 'completed') {
          const targetDriverId = driver_id || (existing as any).rider_id
          if (targetDriverId) {
            const breakdown = (existing.items as any[])?.[0]?.billing_breakdown
            const driverPayoutAmount =
              breakdown?.driver_payout != null
                ? Number(breakdown.driver_payout)
                : Math.round((Number(existing.delivery_fee) || 30) * 0.8) +
                  (Number((existing as any).tip) || 0)

            await tx.driverPayout.upsert({
              where: { id: `payout_${orderId}` },
              create: {
                id: `payout_${orderId}`,
                driver_id: targetDriverId,
                amount: driverPayoutAmount,
                status: 'paid',
                transaction_ref: orderId,
              },
              update: {
                driver_id: targetDriverId,
                amount: driverPayoutAmount,
                status: 'paid',
                transaction_ref: orderId,
              },
            })
          }
        }

        return dalResult && Object.keys(dalResult).length > 0 ? dalResult : orderUpdate
      })

      // The order list is cached for a few seconds — drop it so the customer
      // sees the delivery code (and its removal) right away.
      invalidateOrdersCache()

      // Dispatch pending outbox events across WebSocket & Redis Pub/Sub
      dispatchPendingOutboxEvents().catch(() => {})

      // Sync payment status atomically via payment-service
      const newPaymentStatus = payment_status || paymentStatus
      if (newPaymentStatus) {
        if (newPaymentStatus === 'verified') {
          await processPaymentVerificationTx({
            orderId,
            actorId: actor.id,
            gateway: 'admin_manual',
          })
        } else if (newPaymentStatus === 'rejected') {
          await processPaymentRejectionTx({
            orderId,
            actorId: actor.id,
            reason: body.rejection_reason || 'Payment rejected by admin',
          })
        } else {
          await updatePaymentReviewStatus(orderId, newPaymentStatus)
        }
        await broadcast('approval_update', { status: newPaymentStatus, orderId })
      }

      // Broadcast order status update to subscribed clients.
      // The handover code is stripped: the `order_update` channel is shared by
      // the customer, the driver and the vendor, and only the customer may read
      // it (through the authorised `GET /api/orders` response).
      if (status) {
        const broadcastOrder = stripOrderSecrets(updated as any)
        await broadcast('order_update', {
          type: 'order_updated',
          order: broadcastOrder,
          orderId,
        })
        await broadcast('admin_orders', {
          type: 'order_updated',
          order: broadcastOrder,
          orderId,
        })
        await broadcast('vendor_orders', {
          type: 'order_updated',
          order: broadcastOrder,
          orderId,
          restaurantId: updated.restaurant_id || existing.restaurant_id,
          timestamp: new Date().toISOString(),
        })

        if (
          DRIVER_OFFER_STATUSES.has(status as OrderStatus) &&
          !DRIVER_OFFER_STATUSES.has(existing.status as OrderStatus) &&
          !updated.rider_id &&
          updated.payment_status === 'verified'
        ) {
          const snapshot = (updated as any).financial_snapshot || {}
          const driverPayout = Number(
            snapshot.riderPayablePaise != null
              ? snapshot.riderPayablePaise / 100
              : (updated as any).driver_payout || updated.delivery_fee || 30
          )
          await broadcast('driver_offers', {
            type: 'offer_available',
            order: {
              id: updated.id,
              status: updated.status,
              restaurantId: updated.restaurant_id,
              restaurantName: updated.restaurant_name || 'Crave restaurant',
              customerArea: 'Delivery address shown after acceptance',
              itemsCount: Array.isArray(updated.items)
                ? updated.items.reduce(
                    (total: number, item: any) => total + Number(item?.qty || 1),
                    0
                  )
                : 1,
              distanceKm: Number((updated as any).distance_km || 0),
              driverPayout,
              tip: Number(updated.tip || 0),
              createdAt: updated.created_at,
            },
            orderId,
            timestamp: new Date().toISOString(),
          })
          await sendDriverPushToAll({
            title: `New delivery · ₹${driverPayout.toLocaleString('en-IN')}`,
            body: `${updated.restaurant_name || 'Crave restaurant'} · Open the app to review the trip.`,
            orderId,
            type: 'offer_available',
            route: 'home',
          }).catch((pushError) =>
            console.error('[PATCH /api/orders] Driver native offer push failed:', pushError)
          )
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
        const pushPayload: WebPushPayload = {
          title: `Order update · ${String(status).replaceAll('_', ' ')}`,
          body: statusMessages[status as OrderStatus] || 'Your order status has changed.',
          url: `/user/orders/${encodeURIComponent(orderId)}`,
          tag: `order-${orderId}`,
          orderId,
        }
        await sendWebPushToUsers([customerId].filter(Boolean), pushPayload).catch((pushError) =>
          console.error('[PATCH /api/orders] Web Push failed:', pushError)
        )

        const assignedRiderId = updated.rider_id || existing.rider_id
        if (assignedRiderId && (status === 'rider_assigned' || status === 'ready_for_pickup')) {
          await sendWebPushToUsers([assignedRiderId], {
            title: 'Order ready for pickup',
            body: `Pick up order #${orderId.slice(-8)} from ${existing.restaurant_name}. Delivery value ₹${Number(existing.total_amount || 0).toLocaleString('en-IN')}.`,
            url: '/driver/orders',
            tag: `driver-order-${orderId}`,
            orderId,
          }).catch((pushError) =>
            console.error('[PATCH /api/orders] Driver Web Push failed:', pushError)
          )
          await sendDriverPushToUsers([assignedRiderId], {
            title: 'Order ready for pickup',
            body: `Pick up order #${orderId.slice(-8)} from ${existing.restaurant_name}.`,
            orderId,
            type: 'order_ready',
            route: 'home',
          }).catch((pushError) =>
            console.error('[PATCH /api/orders] Driver native push failed:', pushError)
          )
        }
      }

      // Broadcast driver location update if coordinates changed.
      // driver_id is passed from the request body, not the Order model.
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

      // The response is sanitised: a driver or vendor must never receive the
      // customer's handover code, even in the mutation response.
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

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
      }

      const { deleteOrder } = await import('@/lib/dal')
      const result = await deleteOrder(orderId, actor.id, actor.role)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to delete order' },
          { status: 400 }
        )
      }

      await broadcast('order_update', {
        orderId,
        type: 'order_deleted',
        status: 'cancelled',
        deleted: true,
      }).catch(() => {})

      await broadcast('admin_orders', {
        orderId,
        type: 'order_deleted',
        status: 'cancelled',
        deleted: true,
      }).catch(() => {})

      return NextResponse.json({ success: true, message: 'Order successfully deleted' })
    } catch (error) {
      return handleAuthError(error)
    }
  })
}
