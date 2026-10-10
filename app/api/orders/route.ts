import { createOrder, findOrderById, listOrders, updateOrder } from '@/lib/dal'
import {
  createPaymentReview,
  updatePaymentReviewStatus,
  createVendorSettlement,
  createDriverPayout,
  getActivePaymentConfig,
} from '@/lib/dal/payments'
import { findRestaurantById, listRestaurants } from '@/lib/dal/restaurants'
import { findMenuItemById, listMenuItems } from '@/lib/dal/menu-items'
import {
  findCouponByCode,
  validateAndApplyCoupon,
  checkAndIncrementCouponUsage,
} from '@/lib/dal/coupons'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import {
  calculateOrderPrice,
  tolegacyCalculatorResult,
  type OrderPriceInput,
} from '@/lib/finance/pricing-engine'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import type { OrderStatus } from '@prisma/client'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import {
  requireAuth,
  requireRole,
  requireOwnership,
  AuthError,
  handleAuthError,
  getAuthActor,
} from '@/lib/auth-helpers'

async function getActiveConfig(): Promise<PaymentConfig> {
  try {
    const dbConfig: any = await getActivePaymentConfig()
    if (!dbConfig) return DEFAULT_PAYMENT_CONFIG
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
  } catch {
    return DEFAULT_PAYMENT_CONFIG
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
      const isAdmin = actor.role === 'admin'
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
      discount_amount = 0,
      coupon_code,
      order_type = 'restaurant_food',
      // Client distance is ignored for fee calculation; server computes from coordinates
      customer_lat,
      customer_lng,
    } = body

    // CR-005: Derive customer_id from authenticated session only
    const finalCustomerId = actor.id
    const orderId = id || crypto.randomUUID()
    const paymentConfig = await getActiveConfig()

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
      const quantity = Number(rawItem.quantity || rawItem.qty || 1)

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

      itemsList.push({
        id: itemId,
        name: menuItem.name,
        quantity,
        price,
        lineTotal,
        taxRate: Number((rawItem.taxRate ?? menuItem.hsn_sac_code) ? 5 : 18), // Default tax rates
        priceTaxMode: rawItem.priceTaxMode || menuItem.price_tax_mode || 'TAX_INCLUSIVE',
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
    let couponDiscountAmount = 0
    let couponResult: any = null
    if (coupon_code) {
      couponResult = await validateAndApplyCoupon(coupon_code, foodSubtotal, finalRestaurantId)
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error || 'Invalid coupon' }, { status: 400 })
      }
      couponDiscountAmount = couponResult.discount
    }

    const commercialModel = (restaurantDetails?.commercial_model || 'commission') as
      'commission' | 'markup' | 'hybrid'

    // ─── CR-005: Server-side distance calculation from trusted coordinates ──────
    // Get customer coordinates: from request body or user's default address
    let customerLat: number | null = typeof customer_lat === 'number' ? customer_lat : null
    let customerLng: number | null = typeof customer_lng === 'number' ? customer_lng : null

    // If not provided, try to get from user's default address
    if (customerLat === null || customerLng === null) {
      try {
        // Use prisma to find user's default address
        const { prisma } = await import('@/lib/prisma')
        const defaultAddress = await prisma.customerAddress.findFirst({
          where: { customer_id: finalCustomerId, is_default: true },
          select: { latitude: true, longitude: true },
        })
        if (defaultAddress?.latitude && defaultAddress?.longitude) {
          customerLat = Number(defaultAddress.latitude)
          customerLng = Number(defaultAddress.longitude)
        }
      } catch (e) {
        // Ignore, will use fallback
      }
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
      customerState: restaurantDetails.supplier_state || 'Karnataka',
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

    // ─── Create Order ────────────────────────────────────────
    // CR-007: Generate OTP server-side using crypto.randomInt (not Math.random)
    const deliveryOtp = String(crypto.randomInt(100000, 999999))

    const order = await createOrder({
      id: orderId,
      customer_id: finalCustomerId,
      customer_name: customer_name || (actor as any)?.name || 'Customer',
      customer_phone: customer_phone || undefined,
      customer_address: customer_address || 'Bengaluru',
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
      status: 'payment_submitted' as OrderStatus, // CR-005: Server controls status
      order_type,
      payment_method,
      delivery_otp: deliveryOtp, // CR-007: Server-generated OTP
      tip: Number(tip) || 0,
      discount_amount: calcResult.customerBilling.couponDiscount, // Server-calculated
      coupon_code: coupon_code || undefined,
      commission_amount: Math.round(canonicalResult.grossCommissionPaise / 100),
      markup_amount: Math.round(canonicalResult.markupAmountPaise / 100),
      restaurant_payout: vendorNetPayout,
      platform_revenue: platformProfit,
      utr_ref,
      customer_vpa,
      // CR-004: Persist immutable canonical financial snapshot
    } as any)

    // Increment coupon usage count once order is safely created
    if (coupon_code && couponResult?.coupon?.id) {
      await checkAndIncrementCouponUsage(couponResult.coupon.id).catch((err) => {
        console.warn('Coupon usage increment notice:', err)
      })
    }

    // ─── Best Effort Payment Review Sync ─────────────────────
    // CR-008: UTR format is not proof of payment - keep as pending until verified
    if (utr_ref && customer_vpa) {
      try {
        await createPaymentReview({
          id: crypto.randomUUID(),
          order_id: orderId,
          utr_ref,
          customer_vpa,
          amount: calcResult.customerBilling.grandTotal, // Server-calculated total
          status: 'pending',
        })
      } catch (err) {
        console.warn('Payment review creation notice:', err)
      }
    }

    // ─── Record Vendor Settlement ────────────────────────────
    try {
      await createVendorSettlement({
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
      })
    } catch (settleErr) {
      console.warn('Vendor settlement creation notice:', settleErr)
    }

    // CR-005: Driver assignment is handled by dispatch workflow, not at order creation
    // Driver payout will be created when driver is assigned via PATCH /api/orders

    // Broadcast real-time order creation to Admin WebSocket channels
    await broadcast('admin_stats', {
      type: 'new_order',
      order,
      timestamp: new Date().toISOString(),
    })
    await broadcast('admin_orders', {
      type: 'new_order',
      order,
      timestamp: new Date().toISOString(),
    })
    await broadcast('order_update', {
      type: 'new_order',
      order,
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
    const isOwner =
      (actor.role === 'user' || (actor.role as string) === 'customer') &&
      existing.customer_id === actor.id
    const isVendor =
      (actor.role === 'restaurant_vendor' || actor.role === 'cravexp_store_vendor') &&
      (existing.restaurant_id === (actor as any).restaurantId ||
        existing.restaurant_name === actor.restaurantName)
    const isRiderOrDriver =
      actor.role === 'rider' || (actor.role as string) === 'driver' || actor.role === 'admin'
    const isAssignedRider =
      !existing.rider_id || existing.rider_id === actor.id || actor.role === 'admin'

    // If driver is completing delivery, validate OTP if delivery_otp was generated
    if (requestedStatus === 'delivered' && actor.role !== 'admin' && !isOwner) {
      const providedOtp = String(body.otp || body.delivery_otp || '').trim()
      if (existing.delivery_otp) {
        if (!providedOtp || providedOtp !== String(existing.delivery_otp).trim()) {
          return NextResponse.json({ error: 'Valid delivery OTP is required' }, { status: 400 })
        }
      }
    }

    const allowed =
      !status ||
      actor.role === 'admin' ||
      (isVendor && vendorStatuses.includes(requestedStatus!)) ||
      (isRiderOrDriver && isAssignedRider && riderStatuses.includes(requestedStatus!)) ||
      (isOwner && (status === 'completed' || status === 'delivered'))

    if (
      !allowed ||
      (payment_status && actor.role !== 'admin') ||
      (driver_lat != null && actor.role !== 'rider' && (actor.role as string) !== 'driver')
    ) {
      return NextResponse.json(
        { error: 'You are not allowed to update this order' },
        { status: 403 }
      )
    }

    // Determine rider_id update safely (never overwrite rider_id with vendor/customer actor ID)
    const assignedRiderId = driver_id
      ? driver_id
      : actor.role === 'rider' || (actor.role as string) === 'driver'
        ? actor.id
        : undefined

    // Only pass fields that exist on the Order model to updateOrder.
    const updated = await updateOrder(orderId, {
      ...(status && { status: status as OrderStatus }),
      ...(driver_name && { driver_name }),
      ...(driver_phone && { driver_phone }),
      ...(assignedRiderId && { rider_id: assignedRiderId }),
      ...(driver_lat != null && { delivery_latitude: driver_lat }),
      ...(driver_lng != null && { delivery_longitude: driver_lng }),
      ...(items && { items }),
      ...((status === 'completed' || status === 'delivered') && { delivered_at: new Date() }),
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
