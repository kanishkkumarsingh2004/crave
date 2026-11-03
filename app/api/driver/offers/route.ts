import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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

    const durableOffers = await prisma.dispatchOffer.findMany({
      where: {
        driver_id: actor.id,
        status: 'pending',
        expires_at: { gt: new Date() },
        order: {
          payment_status: 'verified',
          rider_id: null,
          status: 'ready_for_pickup',
        },
      },
      include: { order: true },
      orderBy: { created_at: 'desc' },
      take: 20,
    })
    const offers = durableOffers.map(({ order }) => toSafeOffer(order))

    return NextResponse.json({ success: true, offers })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    console.error('[GET /api/driver/offers]', error)
    return NextResponse.json({ error: 'Unable to load delivery offers' }, { status: 500 })
  }
}
