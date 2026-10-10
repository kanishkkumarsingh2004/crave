import { findOrderById, listOrders, updateOrder } from '@/lib/dal'
import {
  updatePaymentReviewStatus,
  createDriverPayout,
  getActivePaymentConfig,
} from '@/lib/dal/payments'
import { prisma } from '@/lib/prisma'
import { findRestaurantById } from '@/lib/dal/restaurants'
import { findMenuItemById } from '@/lib/dal/menu-items'
import { validateAndApplyCoupon, checkAndIncrementCouponUsage } from '@/lib/dal/coupons'
import { redis, isRedisAvailable } from '@/lib/redis'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import {
  calculateOrderPrice,
  tolegacyCalculatorResult,
  type OrderPriceInput,
} from '@/lib/finance/pricing-engine'
import type { PriceTaxMode } from '@/lib/finance/tax-engine'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import type { OrderStatus } from '@prisma/client'
import crypto from 'crypto'
import {
  requireAuth,
  requireRole,
  AuthError,
  handleAuthError,
  getAuthActor,
} from '@/lib/auth-helpers'
import { isValidTransition, getPhaseName } from '@/lib/order-state-machine'

async function getActiveConfig(): Promise<PaymentConfig> {
  try {
    const dbConfig: any = await getActivePaymentConfig()
    if (!dbConfig) {
      console.error(
        'CRITICAL: No active payment configuration found in database. Order creation blocked.'
      )
      throw new Error(
        'Payment configuration not found. Please configure payment settings in admin panel.'
      )
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
      rainFee:
        dbConfig.rain_fee != null ? Number(dbConfig.rain_fee) : DEFAULT_PAYMENT_CONFIG.rainFee,
      nightSurgeFee:
        dbConfig.night_surge_fee != null
          ? Number(dbConfig.night_surge_fee)
          : DEFAULT_PAYMENT_CONFIG.nightSurgeFee,
      isRainModeActive: dbConfig.is_rain_mode_active ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive,
      isNightSurgeActive:
        dbConfig.is_night_surge_active ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive,
      enableCashOnDelivery:
        dbConfig.enable_cash_on_delivery ?? DEFAULT_PAYMENT_CONFIG.enableCashOnDelivery,
      enableUpiDeepLink: dbConfig.enable_upi_deep_link ?? DEFAULT_PAYMENT_CONFIG.enableUpiDeepLink,
      requireUtrNumber: dbConfig.require_utr_number ?? DEFAULT_PAYMENT_CONFIG.requireUtrNumber,
    }
  } catch (error) {
    console.error('CRITICAL: Failed to load payment configuration:', error)
    throw new Error(
      'Payment configuration unavailable. Cannot process orders. ' +
        'Please check database connectivity and admin payment config.'
    )
  }
}

export async function GET(request: Request) {
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

      const order = await findOrderById(orderId)
      if (!order) {
        return NextResponse.json({
          success: true,
          order: null,
          orders: [],
        })
      }

      // Authorization check for single order access
      const isCustomer = actor.role === 'user' || (actor.role as string) === 'customer'
      const isRider = actor.role === 'rider' || (actor.role as string) === 'driver'
      const isVendorActor =
        actor.role === 'restaurant_vendor' ||
        actor.role === 'cravexp_store_vendor' ||
        (actor.role as string) === 'vendor'

      if (isCustomer && order.customer_id && order.customer_id !== actor.id) {
        return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 })
      }
      if (isRider && order.rider_id && order.rider_id !== actor.id) {
        return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 })
      }
      if (
        isVendorActor &&
        actor.restaurantId &&
        order.restaurant_id &&
        order.restaurant_id !== actor.restaurantId
      ) {
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
      return NextResponse.json({
        success: true,
        order,
        orders: [order],
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
        scopedRestaurantId = (actor as any).restaurantId || vendorId || undefined
      }
    }

    const orders = await listOrders({
      customerId: scopedCustomerId,
      restaurantId: scopedRestaurantId,
      restaurantName: vendorName ?? undefined,
      driverId: scopedDriverId,
      onlyApprovedForVendor: isVendorActor ? true : undefined,
    })

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`order_${clientIp}`, 'ORDER_CREATE')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    // CR-005/CR-019: Use centralized auth - only users can place orders
    const actor = await requireRole(request, 'user')

    const body = await request.json()
    // CR-005/CR-006: Only accept safe, non-financial fields from client
    // Financial fields are computed server-side from trusted DB prices/config
    // CR-005: Client-provided distance is informational only; server calculates from coordinates
    const {
      id,
      customer_name,
      customer_phone,
      customer_address,
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

    // CR-005: Derive customer_id from authenticated session only
    const finalCustomerId = actor.id
    const idempotencyKey =
      request.headers.get('x-idempotency-key') ||
      request.headers.get('idempotency-key') ||
      body.idempotency_key ||
      body.idempotencyKey ||
      null
    const orderId = id || idempotencyKey || crypto.randomUUID()
    const paymentConfig = await getActiveConfig()

    // ─── Deduplication & Idempotency Check ────────────────────────
    // CR-10 FIX: Before returning an existing order, verify it belongs to the
    // authenticated customer.  An attacker who guesses another customer's order ID
    // or supplies it as their idempotency key must receive a generic 404, not the
    // order data.
    const candidateId = id || idempotencyKey
    if (candidateId && typeof prisma?.order?.findUnique === 'function') {
      try {
        const existingOrderById = await prisma.order.findUnique({
          where: { id: candidateId },
        })
        if (existingOrderById) {
          // Ownership check: the order must belong to this customer.
          if (existingOrderById.customer_id !== finalCustomerId) {
            // Return generic 404 — do not reveal that an order with this ID exists.
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
          }
          return NextResponse.json({
            success: true,
            order: existingOrderById,
            orderId: existingOrderById.id,
            message: 'Order already processed (idempotent)',
          })
        }
      } catch (e) {
        // Silently continue if query fails
      }
    }

    // Anti-replay deduplication by UTR reference:
    // If an order was already submitted with this exact bank UTR reference, return it.
    // CR-10 FIX: Apply the same ownership gate here — only return an order whose
    // customer_id matches the authenticated caller.
    if (utr_ref && typeof prisma?.order?.findFirst === 'function') {
      try {
        const cleanUtr = String(utr_ref).trim()
        const existingOrderWithUtr = await prisma.order.findFirst({
          where: {
            utr_ref: cleanUtr,
            // Scope to this customer so one customer cannot deduplicate against
            // another customer's UTR and receive their order data.
            customer_id: finalCustomerId,
          },
          orderBy: { created_at: 'desc' },
        })

        if (existingOrderWithUtr) {
          return NextResponse.json({
            success: true,
            order: existingOrderWithUtr,
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
      // CR-003: If restaurant_id was provided but not found, reject
      if (!restaurant) {
        return NextResponse.json(
          { error: `Restaurant not found: ${restaurant_id}` },
          { status: 404 }
        )
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

    // Fetch each menu item from database for authoritative pricing
    const itemsList = []
    let foodSubtotal = 0

    for (const rawItem of rawItems) {
      const itemId = rawItem.id || rawItem.itemId || rawItem.menuItemId
      const rawQuantity = rawItem.quantity || rawItem.qty || 1

      // CR-08 FIX: Validate quantity - must be positive integer with sensible max
      const quantity = Math.floor(Number(rawQuantity))
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: `Quantity must be a positive integer for item ${itemId || 'unknown'}` },
          { status: 400 }
        )
      }
      if (quantity > 100) {
        return NextResponse.json(
          { error: `Quantity exceeds maximum allowed (100) for item ${itemId || 'unknown'}` },
          { status: 400 }
        )
      }

      if (!itemId) {
        return NextResponse.json(
          { error: 'Each item must have an itemId/menuItemId' },
          { status: 400 }
        )
      }

      // Fetch trusted price from database
      const menuItem = await findMenuItemById(itemId)
      if (!menuItem) {
        return NextResponse.json({ error: `Menu item not found: ${itemId}` }, { status: 404 })
      }

      // Verify item belongs to the requested restaurant (or one of its menu)
      if (restaurant && menuItem.restaurant_id !== restaurant.id) {
        return NextResponse.json(
          { error: `Item ${itemId} not available at this restaurant` },
          { status: 400 }
        )
      }

      // Check stock
      if (
        menuItem.in_stock === false ||
        (menuItem.stock_count !== undefined && menuItem.stock_count < quantity)
      ) {
        return NextResponse.json(
          { error: `Item ${menuItem.name} is out of stock` },
          { status: 400 }
        )
      }

      // Use TRUSTED database price
      const price = Number(menuItem.price || 0)
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
        name: menuItem.name,
        quantity,
        price,
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
      const restaurantIds = new Set(itemsList.map((i) => i._menuItem.restaurant_id).filter(Boolean))
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
      return NextResponse.json({ error: 'Restaurant not found or unavailable' }, { status: 404 })
    }

    const finalRestaurantName = restaurant_name || restaurantDetails.name

    // Clean itemsList for storage - remove internal _menuItem reference
    const itemsForStorage: any[] = itemsList.map(({ _menuItem, ...item }) => item)

    // ─── Validate Coupon (if provided) ─────────────────────────────────
    // CR-03 FIX: Two-phase coupon gate.
    //   Phase 1 (here): validateAndApplyCoupon checks eligibility and computes the discount
    //                   but does NOT increment the counter.
    //   Phase 2 (below): checkAndIncrementCouponUsage atomically claims the slot in Redis
    //                   (INCR with DECR-on-overshoot) before the DB transaction opens.
    //                   If the transaction rolls back, compensateCouponIncrement() releases
    //                   the Redis slot so it is not permanently consumed.
    let couponDiscountAmount = 0
    let couponResult: any = null
    let couponIncrementClaimed = false // tracks whether we must compensate on failure
    if (coupon_code) {
      couponResult = await validateAndApplyCoupon(coupon_code, foodSubtotal, finalRestaurantId)
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error || 'Invalid coupon' }, { status: 400 })
      }
      couponDiscountAmount = couponResult.discount

      // Atomically claim one usage slot (Redis INCR + limit guard)
      if (couponResult.coupon?.id) {
        const usageCheck = await checkAndIncrementCouponUsage(couponResult.coupon.id)
        if (!usageCheck.allowed) {
          return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 })
        }
        couponIncrementClaimed = true
      }
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
          latitude: true,
          longitude: true,
          address_line1: true,
          address_line2: true,
          city: true,
          state: true,
          pincode: true,
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

      // CR-12: The address must have valid, geocoded coordinates — no silent fallback.
      const addrLat = requestedAddress.latitude != null ? Number(requestedAddress.latitude) : null
      const addrLng = requestedAddress.longitude != null ? Number(requestedAddress.longitude) : null
      if (
        addrLat === null ||
        addrLng === null ||
        !Number.isFinite(addrLat) ||
        !Number.isFinite(addrLng)
      ) {
        return NextResponse.json(
          {
            error:
              'Selected delivery address does not have valid coordinates. ' +
              'Please update the address with a precise location before ordering.',
          },
          { status: 422 }
        )
      }

      customerLat = addrLat
      customerLng = addrLng
      customerAddressState = requestedAddress.state || null

      const parts = [
        requestedAddress.address_line1,
        requestedAddress.address_line2,
        requestedAddress.city,
        requestedAddress.state,
        requestedAddress.pincode,
      ].filter(Boolean)
      canonicalAddressText =
        parts.length > 0
          ? parts.join(', ')
          : requestedAddress.label || 'Customer address'
    } else {
      // No explicit address supplied — try default, then any saved address.
      let matchedAddress: any = null

      if (typeof prisma?.customerAddress?.findFirst === 'function') {
        matchedAddress = await prisma.customerAddress.findFirst({
          where: { customer_id: finalCustomerId, is_default: true },
          select: {
            latitude: true,
            longitude: true,
            address_line1: true,
            address_line2: true,
            city: true,
            state: true,
            pincode: true,
            label: true,
          },
        })

        if (!matchedAddress) {
          matchedAddress = await prisma.customerAddress.findFirst({
            where: { customer_id: finalCustomerId },
            select: {
              latitude: true,
              longitude: true,
              address_line1: true,
              address_line2: true,
              city: true,
              state: true,
              pincode: true,
              label: true,
            },
          })
        }
      }

      if (matchedAddress) {
        const addrLat =
          matchedAddress.latitude != null ? Number(matchedAddress.latitude) : null
        const addrLng =
          matchedAddress.longitude != null ? Number(matchedAddress.longitude) : null

        if (
          addrLat !== null &&
          addrLng !== null &&
          Number.isFinite(addrLat) &&
          Number.isFinite(addrLng)
        ) {
          customerLat = addrLat
          customerLng = addrLng
        }
        customerAddressState = matchedAddress.state || null

        const parts = [
          matchedAddress.address_line1,
          matchedAddress.address_line2,
          matchedAddress.city,
          matchedAddress.state,
          matchedAddress.pincode,
        ].filter(Boolean)
        canonicalAddressText =
          parts.length > 0
            ? parts.join(', ')
            : matchedAddress.label || ''
      }

      // CR-12 FIX: When no explicit address was selected and coordinates are still
      // missing, reject instead of silently substituting Bengaluru city centre.
      // The Bengaluru fallback was producing misleading delivery fees and wrong
      // delivery destinations for customers outside that area.
      if (customerLat === null || customerLng === null) {
        return NextResponse.json(
          {
            error:
              'No delivery address with valid coordinates found for your account. ' +
              'Please add and geocode a delivery address before placing an order.',
          },
          { status: 422 }
        )
      }
    }

    if (!canonicalAddressText) {
      canonicalAddressText = 'Customer address'
    }
    // Get restaurant coordinates
    const restaurantLat = restaurantDetails?.latitude ? Number(restaurantDetails.latitude) : null
    const restaurantLng = restaurantDetails?.longitude ? Number(restaurantDetails.longitude) : null

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
      orderType: order_type as 'restaurant_food' | 'cravexp_grocery',
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
        priceTaxMode: i.priceTaxMode,
        taxCategory: 'RESTAURANT_SERVICE' as const,
        taxRatePercent: i.taxRate,
        customCommissionRatePercent: i._menuItem?.custom_commission_rate
          ? Number(i._menuItem.custom_commission_rate)
          : undefined,
        customMarkupRatePercent: i._menuItem?.custom_markup_rate
          ? Number(i._menuItem.custom_markup_rate)
          : undefined,
      })),
      delivery: {
        baseDeliveryFeePaise: Math.round((paymentConfig.baseDeliveryFee || 30) * 100),
        baseDistanceKm: paymentConfig.baseDistanceKm || 2.5,
        perKmRatePaise: Math.round((paymentConfig.perKmRate || 10) * 100),
        freeDeliveryThresholdPaise: Math.round((paymentConfig.freeDeliveryThreshold || 500) * 100),
        // CR-005: Use server-calculated distance, ignore client-provided distance_km
        roadDistanceKm: serverCalculatedDistanceKm,
      },
      surcharges: {
        surgeMultiplier: paymentConfig.surgeMultiplier || 1.0,
        rainFeePaise: Math.round((paymentConfig.rainFee || 0) * 100),
        nightSurgeFeePaise: Math.round((paymentConfig.nightSurgeFee || 0) * 100),
        isRainActive: paymentConfig.isRainModeActive || false,
        isNightSurgeActive: paymentConfig.isNightSurgeActive || false,
      },
      platformFeePaise: Math.round((paymentConfig.platformFee || 6) * 100),
      handlingFeePaise: Math.round((paymentConfig.handlingFee || 5) * 100),
      packagingFeePaise: Math.round((paymentConfig.packagingCap || 20) * 100),
      smallCartFeePaise: 0,
      smallCartThresholdPaise: 0,
      couponDiscountPaise: Math.round(couponDiscountAmount * 100),
      couponFundingSource: 'SHARED',
      restaurantDiscountSharePercent: 50,
      tipPaise: Math.round((tip || 0) * 100),
      contract: {
        contractNumber: restaurantDetails.contract_number || 'DEFAULT',
        version: 1,
        commercialModel,
        commissionRatePercent: Number(
          restaurantDetails.commission_rate || paymentConfig.vendorCommission || 15
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

    // ─── Create Order + Side Effects in Atomic Transaction ─────────────
    // CR-007 FIX: Use Prisma transaction for atomic order + side effects
    let order: any
    try {
      order = await prisma.$transaction(async (tx: any) => {
        // 1. Create order
        const createdOrder = await tx.order.create({
          data: {
            id: orderId,
            customer_id: finalCustomerId,
            customer_name: customer_name || (actor as any)?.name || 'Customer',
            customer_phone: customer_phone || undefined,
            // CR-06 FIX: Use the verified canonical address from the saved address record,
            // not the raw client-supplied string.  Both the label stored here and the
            // coordinates used for the delivery-fee calculation come from the same DB row.
            customer_address: canonicalAddressText,
            restaurant_id: finalRestaurantId || undefined,
            restaurant_name: finalRestaurantName,
            items: itemsForStorage,
            subtotal: foodSubtotal,
            packaging_fee: capPackaging,
            delivery_fee: calcResult.customerBilling.netDeliveryFee,
            platform_fee: calcResult.customerBilling.platformFee,
            handling_fee: calcResult.customerBilling.handlingFee,
            gst: calcResult.customerBilling.gstAmount,
            total_amount: calcResult.customerBilling.grandTotal,
            status: 'payment_submitted' as OrderStatus,
            order_type,
            payment_method,
            delivery_otp: deliveryOtp,
            tip: Number(tip) || 0,
            discount_amount: calcResult.customerBilling.couponDiscount,
            coupon_code: coupon_code || undefined,
            commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
            markup_amount: Math.round(canonicalResult.markupAmountPaise / 100),
            restaurant_payout: vendorNetPayout,
            platform_revenue: platformProfit,
            utr_ref,
            customer_vpa: customer_vpa || (actor as any)?.email || 'customer@upi',
            financial_snapshot: canonicalResult as any,
          },
        })

        // 2. Increment coupon usage in DB (Redis slot was already claimed atomically above;
        //    this keeps the DB used_count in sync inside the same transaction).
        if (coupon_code && couponResult?.coupon?.id) {
          await tx.coupon.update({
            where: { id: couponResult.coupon.id },
            data: { used_count: { increment: 1 } },
          })
        }

        // 3. Create payment review (if UTR provided)
        if (utr_ref) {
          await tx.paymentReview.create({
            data: {
              id: crypto.randomUUID(),
              order_id: orderId,
              utr_ref,
              customer_vpa: customer_vpa || (actor as any)?.email || 'customer@upi',
              amount: calcResult.customerBilling.grandTotal,
              status: 'pending',
            },
          })
        }

        // 4. Create vendor settlement
        await tx.vendorSettlement.create({
          data: {
            id: `set_${orderId}`,
            restaurant_name: finalRestaurantName,
            restaurant_id: finalRestaurantId,
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
        })

        return createdOrder
      })
    } catch (txErr: any) {
      // CR-03 FIX: Release the Redis coupon slot if the DB transaction failed.
      // checkAndIncrementCouponUsage already does a DECR internally on overshoot, but if
      // the transaction fails for an unrelated reason after the slot was claimed we must
      // give it back so future orders can use it.
      if (couponIncrementClaimed && couponResult?.coupon?.id) {
        if (isRedisAvailable() && redis) {
          redis.decr(`crave:coupon:usage:${couponResult.coupon.id}`).catch(() => {})
        }
      }

      // Anti-concurrency collision recovery: If duplicate order ID or duplicate UTR was inserted concurrently
      if (txErr?.code === 'P2002') {
        const recoveredOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderId },
              ...(utr_ref ? [{ utr_ref }] : []),
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
            message: 'Order already processed (concurrent collision resolved)',
          })
        }
      }
      throw txErr
    }

    // CR-005: Driver assignment is handled by dispatch workflow, not at order creation
    // Driver payout will be created when driver is assigned via PATCH /api/orders

    // Register order with internal WebSocket server for authorized customer tracking
    await broadcast('__internal_register_order', {
      customerId: finalCustomerId,
      orderId,
    })

    // Broadcast real-time order creation to Admin WebSocket channels
    await broadcast('admin_stats', {
      type: 'new_order',
      order,
      orderId,
      timestamp: new Date().toISOString(),
    })
    await broadcast('admin_orders', {
      type: 'new_order',
      order,
      orderId,
      timestamp: new Date().toISOString(),
    })
    await broadcast('order_update', {
      type: 'new_order',
      order,
      orderId,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Order created successfully!',
      order,
      billing: billingBreakdown,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PATCH(request: Request) {
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
          return NextResponse.json({ error: 'Delivery OTP has already been used' }, { status: 409 })
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
          return NextResponse.json({ error: 'Invalid delivery OTP' }, { status: 400 })
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
            validNextStates:
              Object.values(require('@/lib/order-state-machine').VALID_TRANSITIONS)[
                Object.values(require('@/lib/order-state-machine').OrderStatus).indexOf(
                  currentStatus
                )
              ] || [],
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
          require('@/lib/order-state-machine').VALID_TRANSITIONS[currentStatus] || []
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
    const updated = await prisma.$transaction(async (tx: any) => {
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
          data: {
            ...(status && { status: status as OrderStatus }),
            ...(driver_name && { driver_name }),
            ...(driver_phone && { driver_phone }),
            ...(assignedRiderId && { rider_id: assignedRiderId }),
            ...(driver_lat != null && { delivery_latitude: driver_lat }),
            ...(driver_lng != null && { delivery_longitude: driver_lng }),
            ...(items && { items }),
            ...(isDeliveryConfirmation && { delivered_at: new Date() }),
            // CR-03: Consume OTP atomically with the status transition (driver path only)
            ...(isDeliveryConfirmation && !isAdmin && { otp_consumed_at: new Date() }),
          },
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
      if (isDeliveryConfirmation && isAdmin) {
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

      return orderUpdate
    })

    // Sync payment status to payment_reviews (separate table — not on Order).
    const newPaymentStatus = payment_status || paymentStatus
    if (newPaymentStatus) {
      try {
        await updatePaymentReviewStatus(orderId, newPaymentStatus)
      } catch (e) {}
      await broadcast('approval_update', { status: newPaymentStatus, orderId })
    }

    // Broadcast order status update to subscribed clients.
    if (status) {
      await broadcast('order_update', { order: updated, orderId })
      await broadcast('admin_orders', { order: updated, orderId })
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

    // If order completed, record driver payout.
    if (status === 'completed') {
      try {
        const targetDriverId = driver_id || (existing as any).rider_id
        if (targetDriverId) {
          const breakdown = (existing.items as any[])?.[0]?.billing_breakdown
          const driverPayoutAmount =
            breakdown?.driver_payout != null
              ? Number(breakdown.driver_payout)
              : Math.round((Number(existing.delivery_fee) || 30) * 0.8) +
                (Number((existing as any).tip) || 0)

          await createDriverPayout({
            id: `payout_${orderId}`,
            driver_id: targetDriverId,
            amount: driverPayoutAmount,
            status: 'paid',
            transaction_ref: orderId,
          })
        }
      } catch (e) {
        console.warn('Driver payout creation notice:', e)
      }
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}
