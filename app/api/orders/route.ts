import { getOrders, OrderRecord, saveOrder } from '@/lib/order-store'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const vendorId = searchParams.get('vendorId')
    const orderId = searchParams.get('orderId')

    let orders = getOrders()

    if (orderId) {
      const match = orders.find((o) => o.id === orderId)
      return NextResponse.json({ success: true, order: match || null, orders: match ? [match] : [] })
    }

    if (customerId) {
      orders = orders.filter((o) => o.customer_id === customerId)
    }

    if (vendorId) {
      orders = orders.filter((o) => o.restaurant_id === vendorId)
    }

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
      status = 'new',
      payment_method = 'UPI Online',
      delivery_otp,
      utr_ref,
      customer_vpa,
    } = body

    if (!customer_id || !restaurant_id || !total_amount) {
      return NextResponse.json(
        { error: 'Customer, restaurant, and order total amount are required' },
        { status: 400 }
      )
    }

    const orderId = id || crypto.randomUUID()
    const orderRecord: OrderRecord = {
      id: orderId,
      customer_id,
      customer_name: customer_name || 'Customer',
      customer_phone: customer_phone || undefined,
      customer_address: customer_address || 'Bengaluru',
      restaurant_id,
      restaurant_name: restaurant_name || 'Crave Kitchen Store',
      items: Array.isArray(items) ? items : typeof items === 'string' ? JSON.parse(items) : [],
      subtotal: Number(subtotal) || 0,
      packaging_fee: Number(packaging_fee) || 0,
      gst: Number(gst) || 0,
      total_amount: Number(total_amount) || 0,
      status,
      payment_method,
      delivery_otp: String(delivery_otp || '1234'),
      utr_ref: utr_ref || undefined,
      customer_vpa: customer_vpa || undefined,
      payment_status: 'pending',
      createdAt: new Date().toISOString(),
    }

    // Save to local order store
    saveOrder(orderRecord)

    // Best effort Supabase payment_reviews table sync
    if (utr_ref && customer_vpa) {
      try {
        await supabase.from('payment_reviews').insert([
          {
            id: crypto.randomUUID(),
            order_id: orderId,
            utr_ref,
            customer_vpa,
            amount: Number(total_amount),
            status: 'pending',
          },
        ])
      } catch (err) {
        console.warn('Supabase payment_reviews notice:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully!',
      order: orderRecord,
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
    const body = await request.json()
    const { orderId, status, payment_status, paymentStatus } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const orders = getOrders()
    const existing = orders.find((o) => o.id === orderId)

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const newPaymentStatus = payment_status || paymentStatus || existing.payment_status
    const newStatus = status || existing.status

    const updated: OrderRecord = {
      ...existing,
      status: newStatus,
      payment_status: newPaymentStatus,
    }

    saveOrder(updated)

    // Sync status back to Supabase payment_reviews if applicable
    if (newPaymentStatus) {
      try {
        await supabase
          .from('payment_reviews')
          .update({ status: newPaymentStatus })
          .eq('order_id', orderId)
      } catch (e) {}
    }

    return NextResponse.json({ success: true, order: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update order' }, { status: 500 })
  }
}
