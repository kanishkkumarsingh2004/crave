import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { listOrders } from '@/lib/dal/orders'
import { NextResponse } from 'next/server'

const OFFER_STATUSES = new Set(['sent_to_vendor', 'preparing', 'packing', 'ready_for_pickup'])

function toSafeOffer(order: any) {
  let items: any[] = []
  try {
    items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
        ? JSON.parse(order.items)
        : []
  } catch {}

  const financialSnapshot = order.financial_snapshot || {}
  const driverPayout = Number(
    financialSnapshot.riderPayablePaise != null
      ? financialSnapshot.riderPayablePaise / 100
      : order.driver_payout || order.delivery_fee || 30
  )

  return {
    id: order.id,
    status: order.status,
    restaurantId: order.restaurant_id,
    restaurantName: order.restaurant_name || 'Crave restaurant',
    customerArea: 'Delivery address shown after acceptance',
    itemsCount: items.reduce((total, item) => total + Number(item?.qty || 1), 0) || 1,
    distanceKm: Number(order.distance_km || 0),
    driverPayout,
    tip: Number(order.tip || 0),
    createdAt: order.created_at,
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'rider' && (actor.role as string) !== 'driver') {
      return NextResponse.json({ error: 'Delivery partner access required' }, { status: 403 })
    }

    const orders = await listOrders({ limit: 50 })
    const offers = orders
      .filter(
        (order: any) =>
          OFFER_STATUSES.has(order.status) && order.payment_status === 'verified' && !order.rider_id
      )
      .slice(0, 20)
      .map(toSafeOffer)

    return NextResponse.json({ success: true, offers })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[GET /api/driver/offers]', error)
    return NextResponse.json({ error: 'Unable to load delivery offers' }, { status: 500 })
  }
}
