import { createOrder, findOrderById, listOrders, updateOrder } from '@/lib/dal'
import {
  createPaymentReview,
  updatePaymentReviewStatus,
  createVendorSettlement,
  createDriverPayout,
  getActivePaymentConfig,
} from '@/lib/dal/payments'
import { findRestaurantById, listRestaurants } from '@/lib/dal/restaurants'
import {
  findCouponByCode,
  validateAndApplyCoupon,
  checkAndIncrementCouponUsage,
} from '@/lib/dal/coupons'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import { calculateFullBreakdown } from '@/lib/calculator'
import { calculateOrderPriceSnapshot } from '@/lib/commercial-engine'
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
    const actor = await getAuthActor(request)
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const vendorId = searchParams.get('vendorId')
    const vendorName = searchParams.get('vendorName')
    const orderId = searchParams.get('orderId')
    const driverId = searchParams.get('driverId') || searchParams.get('riderId')

    const isVendorActor =
      actor?.role === 'restaurant_vendor' ||
      actor?.role === 'cravexp_store_vendor' ||
      (actor?.role as string) === 'vendor'
    const isVendorQuery = Boolean(vendorId || vendorName || isVendorActor)

    if (orderId) {
      const order = await findOrderById(orderId)
      if (!order) {
        return NextResponse.json({
          success: true,
          order: null,
          orders: [],
        })
      }

      // Authorization check for single order access
      if (actor && actor.role !== 'admin') {
        const isCustomer = actor.role === 'user' || (actor.role as string) === 'customer'
        const isRider = actor.role === 'rider' || (actor.role as string) === 'driver'

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
      }

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

    // For non-admin users, require authentication for list operations
    if (!actor && !orderId && !isVendorActor) {
      return handleAuthError(new AuthError('Authentication required', 401))
    }

    const orders = await listOrders({
      customerId: scopedCustomerId,
      restaurantId: scopedRestaurantId,
      restaurantName: vendorName ?? undefined,
      driverId: scopedDriverId,
      onlyApprovedForVendor: isVendorQuery ? true : undefined,
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
      distance_km,
    } = body

    // CR-005: Derive customer_id from authenticated session only
    const finalCustomerId = actor.id

    // CR-006: Recompute subtotal from items (not client-submitted)
    const itemsList: any[] = Array.isArray(items)
      ? items
      : typeof items === 'string'
        ? JSON.parse(items)
        : []
    const foodSubtotal = itemsList.reduce(
      (sum, i: any) => sum + Number(i.price || 0) * Number(i.quantity || i.qty || 1),
      0
    )

    const rawRestaurantId =
      restaurant_id ||
      body.restaurantId ||
      (Array.isArray(items) && items[0]
        ? items[0].restaurantId || items[0].vendorId || items[0].restaurant_id
        : '')

    const orderId = id || crypto.randomUUID()
    const paymentConfig = await getActiveConfig()

    // ─── Resolve Valid Restaurant Record ────────────────────────
    let restaurant: any = null
    if (rawRestaurantId && typeof findRestaurantById === 'function') {
      try {
        restaurant = await findRestaurantById(rawRestaurantId)
      } catch (e) {
        restaurant = null
      }
    }

    let finalRestaurantId: string | null = null
    let finalRestaurantName: string = restaurant_name || 'Crave Kitchen Store'

    if (restaurant) {
      finalRestaurantId = restaurant.id
      finalRestaurantName = restaurant_name || restaurant.name
    } else {
      let rests: any[] = []
      if (typeof listRestaurants === 'function') {
        try {
          rests = (await listRestaurants({ isOpen: true })) || []
        } catch (e) {
          rests = []
        }
      }

      if (rests.length > 0) {
        restaurant = rests[0]
        finalRestaurantId = rests[0].id
        finalRestaurantName = restaurant_name || rests[0].name || 'Crave Kitchen Store'
      } else if (rawRestaurantId) {
        finalRestaurantId = rawRestaurantId
        finalRestaurantName = restaurant_name || 'Crave Kitchen Store'
      } else {
        finalRestaurantId = null
      }
    }

    if (!finalRestaurantId) {
      return NextResponse.json({ error: 'Restaurant is required' }, { status: 400 })
    }

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

    // ─── Live Commercial Calculation via Central Engine ────────────────
    const commercialModel = (restaurant?.commercial_model || 'commission') as
      'commission' | 'markup' | 'hybrid'
    const isMarkupModel = commercialModel === 'markup'
    const isHybridModel = commercialModel === 'hybrid'
    const commissionRate = isMarkupModel
      ? 0
      : Number(restaurant?.commission_rate ?? paymentConfig.vendorCommission ?? 15)
    const markupRate = isMarkupModel || isHybridModel ? Number(restaurant?.markup_rate ?? 0) : 0

    const commercialSnapshot = calculateOrderPriceSnapshot({
      restaurantId: finalRestaurantId || 'rest_01',
      restaurantName: finalRestaurantName,
      supplierState: restaurant?.supplier_state || 'Karnataka',
      contract: {
        commercialModel,
        commissionRate,
        markupRate,
        fixedCommissionAmount: Number(restaurant?.fixed_commission ?? 0),
        fixedMarkupAmount: Number(restaurant?.fixed_markup ?? 0),
        priceTaxMode: (restaurant?.price_tax_mode as any) || 'TAX_INCLUSIVE',
      },
      items: itemsList.map((i: any) => ({
        name: i.name || 'Food Item',
        quantity: Number(i.quantity || i.qty || 1),
        price: Number(i.price || 0),
        taxRate: Number(i.taxRate ?? 5),
        priceTaxMode: i.priceTaxMode || restaurant?.price_tax_mode || 'TAX_INCLUSIVE',
      })),
      tip: Number(tip) || 0,
      couponDiscountAmount: couponDiscountAmount,
    })

    // Accept real distance from client or default to base distance (avoids incorrect fee calc)
    const resolvedDistanceKm =
      typeof distance_km === 'number' && distance_km > 0
        ? distance_km
        : paymentConfig.baseDistanceKm || 2.5

    const calcResult = calculateFullBreakdown(
      {
        subtotal: foodSubtotal,
        distanceKm: resolvedDistanceKm,
        packagingFee: paymentConfig.packagingCap || 20, // CR-006: Server-controlled packaging fee
        tip: Number(tip) || 0,
        restaurantName: finalRestaurantName,
        vendorCommissionPercent: commissionRate,
        driverPayoutSharePercent: paymentConfig.driverPayoutShare,
        platformFee: paymentConfig.platformFee,
        handlingFee: paymentConfig.handlingFee,
        baseDeliveryFee: paymentConfig.baseDeliveryFee,
        baseDistanceKm: paymentConfig.baseDistanceKm,
        perKmRate: paymentConfig.perKmRate,
        freeDeliveryThreshold: paymentConfig.freeDeliveryThreshold,
        surgeMultiplier: paymentConfig.surgeMultiplier,
        rainFee: paymentConfig.rainFee,
        nightSurgeFee: paymentConfig.nightSurgeFee,
        isRainModeActive: paymentConfig.isRainModeActive,
        isNightSurgeActive: paymentConfig.isNightSurgeActive,
      },
      couponDiscountAmount > 0
        ? { discount_type: 'flat', discount_value: couponDiscountAmount }
        : undefined
    )

    const capPackaging = calcResult.customerBilling.packagingFee
    const vendorNetPayout =
      commercialSnapshot.restaurantPayableNet || calcResult.vendorSettlement.netVendorPayout
    const driverPayout = calcResult.driverEarnings.totalDriverEarnings
    const platformProfit =
      commercialSnapshot.platformNetRevenue || calcResult.platformEconomics.platformNetProfit

    const billingBreakdown = {
      subtotal: foodSubtotal,
      commercial_model: commercialModel,
      markup_rate: markupRate,
      markup_amount: commercialSnapshot.markupAmount,
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
      vendor_commission_rate: commissionRate,
      vendor_commission_amount: commercialSnapshot.grossCommission,
      vendor_net_payout: vendorNetPayout,
      driver_payout: driverPayout,
      driver_base_payout: calcResult.driverEarnings.baseDistanceShare,
      driver_extra_distance_payout: calcResult.driverEarnings.extraDistanceShare,
      driver_surge_payout: calcResult.driverEarnings.surgeRainShare,
      driver_payout_share: paymentConfig.driverPayoutShare,
      platform_net_profit: platformProfit,
    }

    if (itemsList.length > 0) {
      itemsList[0].billing_breakdown = billingBreakdown
    } else {
      itemsList.push({
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
      items: itemsList,
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
      commission_amount: commercialSnapshot.grossCommission,
      markup_amount: commercialSnapshot.markupAmount,
      restaurant_payout: vendorNetPayout,
      platform_revenue: platformProfit,
      utr_ref,
      customer_vpa,
    })

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
        commission_rate: commissionRate,
        commission_amount: calcResult.vendorSettlement.commissionDeducted,
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
