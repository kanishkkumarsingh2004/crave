import { createOrder, findOrderById, listOrders, updateOrder } from '@/lib/dal'
import {
  createPaymentReview,
  updatePaymentReviewStatus,
  createVendorSettlement,
  createDriverPayout,
  getActivePaymentConfig,
} from '@/lib/dal/payments'
import { findRestaurantById, listRestaurants } from '@/lib/dal/restaurants'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import { calculateFullBreakdown } from '@/lib/calculator'
import { calculateOrderPriceSnapshot } from '@/lib/commercial-engine'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import type { OrderStatus } from '@prisma/client'
import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function getActor(request: Request): Promise<JWTPayload | null> {
  const header = request.headers.get('authorization')
  let token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
  return token ? verifyToken(token) : null
}

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
    const customerId = searchParams.get('customerId')
    const vendorId = searchParams.get('vendorId')
    const vendorName = searchParams.get('vendorName')
    const orderId = searchParams.get('orderId')
    const driverId = searchParams.get('driverId') || searchParams.get('riderId')

    if (orderId) {
      const order = await findOrderById(orderId)
      return NextResponse.json({
        success: true,
        order,
        orders: order ? [order] : [],
      })
    }

    const orders = await listOrders({
      customerId: customerId ?? undefined,
      restaurantId: vendorId ?? undefined,
      restaurantName: vendorName ?? undefined,
      driverId: driverId ?? undefined,
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch orders' }, { status: 500 })
  }
}

import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const { allowed, resetTime } = checkRateLimit(`order_${clientIp}`, 30, 60000)
    if (!allowed) {
      return rateLimitResponse(resetTime)
    }

    const actor = await getActor(request)
    if (!actor || actor.role !== 'user') {
      return NextResponse.json(
        { error: 'Only authenticated users can place orders' },
        { status: 401 }
      )
    }
    const body = await request.json()
    const {
      id,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      restaurant_id,
      restaurant_name,
      items,
      subtotal,
      packaging_fee,
      gst,
      total_amount,
      status = 'payment_submitted',
      payment_method = 'UPI Online',
      delivery_otp,
      utr_ref,
      customer_vpa,
      tip = 0,
      discount_amount = 0,
      coupon_code,
      delivery_fee,
      driver_id,
      driver_name,
      order_type = 'restaurant_food',
    } = body
    const finalCustomerId = actor?.id || customer_id
    if (customer_id && actor?.id && customer_id !== actor.id) {
      return NextResponse.json(
        { error: 'Customer, restaurant, and order total amount are required' },
        { status: 400 }
      )
    }

    if (!finalCustomerId || !total_amount) {
      return NextResponse.json({ error: 'Customer and total amount are required' }, { status: 400 })
    }

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

    // ─── Live Commercial Calculation via Central Engine ────────────────
    const commercialModel = (restaurant?.commercial_model || 'commission') as
      'commission' | 'markup' | 'hybrid'
    const isMarkupModel = commercialModel === 'markup'
    const isHybridModel = commercialModel === 'hybrid'
    const commissionRate = isMarkupModel
      ? 0
      : Number(restaurant?.commission_rate ?? paymentConfig.vendorCommission ?? 15)
    const markupRate = isMarkupModel || isHybridModel ? Number(restaurant?.markup_rate ?? 0) : 0
    const foodSubtotal = Number(subtotal) || 0

    const itemsList = Array.isArray(items)
      ? items
      : typeof items === 'string'
        ? JSON.parse(items)
        : []

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
      couponDiscountAmount: Number(discount_amount) || 0,
    })

    const calcResult = calculateFullBreakdown(
      {
        subtotal: foodSubtotal,
        distanceKm: 2.5,
        packagingFee: Number(packaging_fee) || 20,
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
      discount_amount > 0
        ? { discount_type: 'flat', discount_value: Number(discount_amount) }
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
      tip: calcResult.customerBilling.tip,
      discount_amount: calcResult.customerBilling.couponDiscount,
      total_amount: Number(total_amount) || calcResult.customerBilling.grandTotal,
      vendor_commission_rate: commissionRate,
      vendor_commission_amount: commercialSnapshot.grossCommission,
      vendor_net_payout: vendorNetPayout,
      driver_payout: driverPayout,
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
      gst: Number(gst) || 0,
      total_amount: Number(total_amount) || 0,
      status: status as OrderStatus,
      order_type,
      payment_method,
      delivery_otp: String(
        delivery_otp && String(delivery_otp).trim().length >= 4
          ? delivery_otp
          : Math.floor(100000 + Math.random() * 900000)
      ),
      tip: Number(tip) || 0,
      discount_amount: Number(discount_amount) || 0,
      coupon_code: coupon_code || undefined,
      commission_amount: commercialSnapshot.grossCommission,
      markup_amount: commercialSnapshot.markupAmount,
      restaurant_payout: vendorNetPayout,
      platform_revenue: platformProfit,
      utr_ref,
      customer_vpa,
    })

    // ─── Best Effort Payment Review Sync ─────────────────────
    if (utr_ref && customer_vpa) {
      try {
        await createPaymentReview({
          id: crypto.randomUUID(),
          order_id: orderId,
          utr_ref,
          customer_vpa,
          amount: Number(total_amount),
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
        restaurant_name: restaurant_name || restaurant?.name || 'Crave Kitchen Store',
        restaurant_id,
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

    // ─── Record Driver Payout ────────────────────────────────
    if (driver_id || driver_name) {
      try {
        await createDriverPayout({
          id: `payout_${orderId}`,
          driver_id: driver_id || 'drv_default',
          amount: driverPayout,
          status: 'pending',
          transaction_ref: orderId,
        })
      } catch (payoutErr) {
        console.warn('Driver payout creation notice:', payoutErr)
      }
    }

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
  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process order' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getActor(request)
    if (!actor) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

    const allowed =
      !status ||
      actor.role === 'admin' ||
      (isVendor && vendorStatuses.includes(requestedStatus!)) ||
      (isRiderOrDriver && riderStatuses.includes(requestedStatus!)) ||
      (isOwner && status === 'completed')

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

    // Only pass fields that exist on the Order model to updateOrder.
    const updated = await updateOrder(orderId, {
      ...(status && { status: status as OrderStatus }),
      ...(driver_name && { driver_name }),
      ...(driver_phone && { driver_phone }),
      ...((driver_id || (actor as any)?.id) && { rider_id: driver_id || (actor as any)?.id }),
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
        const paymentConfig = await getActiveConfig()
        const deliveryFee = paymentConfig.baseDeliveryFee
        const driverPayoutAmount =
          Math.round(deliveryFee * (paymentConfig.driverPayoutShare / 100)) +
          (Number((existing as any).tip) || 0)

        if (driver_id || driver_name) {
          await createDriverPayout({
            id: `payout_${orderId}`,
            driver_id: driver_id || 'drv_default',
            amount: driverPayoutAmount,
            status: 'completed',
            transaction_ref: orderId,
          })
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update order' }, { status: 500 })
  }
}
