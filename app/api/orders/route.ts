import { createOrder, findOrderById, listOrders, updateOrder } from '@/lib/dal'
import {
  createPaymentReview,
  updatePaymentReviewStatus,
  createVendorSettlement,
  createDriverPayout,
} from '@/lib/dal/payments'
import { findRestaurantById } from '@/lib/dal/restaurants'
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import { broadcast } from '@/lib/ws-server'
import fs from 'fs'
import path from 'path'
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

function getActiveConfig(): PaymentConfig {
  try {
    const configPath = path.join(process.cwd(), 'data', 'payment_config.json')
    if (fs.existsSync(configPath)) {
      return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    }
  } catch {}
  return DEFAULT_PAYMENT_CONFIG
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const vendorId = searchParams.get('vendorId')
    const vendorName = searchParams.get('vendorName')
    const orderId = searchParams.get('orderId')

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
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor(request)
    if (!actor || actor.role !== 'user') {
      return NextResponse.json({ error: 'Only authenticated users can place orders' }, { status: 401 })
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

    if (customer_id !== actor.id || !customer_id || !restaurant_id || !total_amount) {
      return NextResponse.json(
        { error: 'Customer, restaurant, and order total amount are required' },
        { status: 400 }
      )
    }

    const orderId = id || crypto.randomUUID()
    const paymentConfig = getActiveConfig()

    // ─── Live Billing Split Calculation ──────────────────────
    const restaurant = restaurant_id
      ? await findRestaurantById(restaurant_id).catch(() => null)
      : null
    const commissionRate = restaurant?.commission_rate ?? paymentConfig.vendorCommission ?? 15
    const foodSubtotal = Number(subtotal) || 0
    const commissionAmount = Math.round((foodSubtotal * commissionRate) / 100)
    const capPackaging = Math.min(Number(packaging_fee) || 0, paymentConfig.packagingCap || 20)
    const vendorNetPayout = foodSubtotal - commissionAmount + capPackaging

    const actualDeliveryFee = Number(
      delivery_fee != null ? delivery_fee : paymentConfig.baseDeliveryFee
    )
    const driverPayout =
      Math.round(actualDeliveryFee * (paymentConfig.driverPayoutShare / 100)) + (Number(tip) || 0)
    const platformProfit =
      Math.round((Number(total_amount) - vendorNetPayout - driverPayout) * 100) / 100

    const billingBreakdown = {
      subtotal: foodSubtotal,
      packaging_fee: capPackaging,
      delivery_fee: actualDeliveryFee,
      gst: Number(gst) || 0,
      tip: Number(tip) || 0,
      discount_amount: Number(discount_amount) || 0,
      total_amount: Number(total_amount),
      vendor_commission_rate: commissionRate,
      vendor_commission_amount: commissionAmount,
      vendor_net_payout: vendorNetPayout,
      driver_payout: driverPayout,
      platform_net_profit: platformProfit,
    }

    // ─── Create Order ────────────────────────────────────────
    const order = await createOrder({
      id: orderId,
      customer_id,
      customer_name: customer_name || 'Customer',
      customer_phone: customer_phone || undefined,
      customer_address: customer_address || 'Bengaluru',
      restaurant_id,
      restaurant_name: restaurant_name || restaurant?.name || 'Crave Kitchen Store',
      items: Array.isArray(items) ? items : typeof items === 'string' ? JSON.parse(items) : [],
      subtotal: foodSubtotal,
      packaging_fee: capPackaging,
      gst: Number(gst) || 0,
      total_amount: Number(total_amount) || 0,
      status: status as OrderStatus,
      order_type,
      payment_method,
      delivery_otp: String(delivery_otp || '1234'),
      tip: Number(tip) || 0,
      discount_amount: Number(discount_amount) || 0,
      coupon_code: coupon_code || undefined,
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
        commission_amount: commissionAmount,
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
    const riderStatuses: OrderStatus[] = ['picked_up', 'out_for_delivery', 'delivered', 'completed']
    const requestedStatus = status as OrderStatus | undefined
    const isOwner =
      actor.role === 'user' && existing.customer_id === actor.id
    const isVendor =
      (actor.role === 'restaurant_vendor' || actor.role === 'cravexp_store_vendor') &&
      (existing.restaurant_id === (actor as any).restaurantId ||
        existing.restaurant_name === actor.restaurantName)
    const allowed =
      !status ||
      (actor.role === 'admin' && ['payment_verified', 'sent_to_vendor', 'cancelled'].includes(status)) ||
      (isVendor && vendorStatuses.includes(requestedStatus!)) ||
      (actor.role === 'rider' && riderStatuses.includes(requestedStatus!))

    if (!allowed || (payment_status && actor.role !== 'admin') || (driver_lat != null && actor.role !== 'rider')) {
      return NextResponse.json({ error: 'You are not allowed to update this order' }, { status: 403 })
    }

    // Only pass fields that exist on the Order model to updateOrder.
    const updated = await updateOrder(orderId, {
      ...(status && { status: status as OrderStatus }),
      ...(driver_name && { driver_name }),
      ...(driver_phone && { driver_phone }),
      ...(driver_lat != null && { delivery_latitude: driver_lat }),
      ...(driver_lng != null && { delivery_longitude: driver_lng }),
      ...(items && { items }),
      ...(status === 'completed' && { delivered_at: new Date() }),
    })

    // Sync payment status to payment_reviews (separate table — not on Order).
    const newPaymentStatus = payment_status || paymentStatus
    if (newPaymentStatus) {
      try {
        await updatePaymentReviewStatus(orderId, newPaymentStatus)
      } catch (e) {}
      broadcast('approval_update', { status: newPaymentStatus, orderId })
    }

    // Broadcast order status update to subscribed clients.
    if (status) {
      broadcast('order_update', { order: updated, orderId })
    }

    // Broadcast driver location update if coordinates changed.
    // driver_id is passed from the request body, not the Order model.
    if (driver_lat != null && driver_lng != null) {
      broadcast('driver_location', {
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
        const paymentConfig = getActiveConfig()
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
