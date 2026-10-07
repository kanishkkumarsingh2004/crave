import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/dal/orders'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor?.id || 'driver_partner'

    const allOrders = await listOrders()

    // Filter orders assigned to this driver
    const driverOrders = allOrders.filter(
      (o: any) =>
        o.rider_id === driverId ||
        (o.driver_name &&
          actor?.name &&
          o.driver_name.toLowerCase() === actor.name.toLowerCase()) ||
        (driverId === 'driver_partner' && (o.driver_name || o.rider_id))
    )

    const activeOrder = driverOrders.find((o: any) =>
      ['rider_assigned', 'picked_up', 'out_for_delivery', 'ready_for_pickup'].includes(o.status)
    )

    const completedTrips = driverOrders
      .filter((o: any) => ['delivered', 'completed'].includes(o.status))
      .map((o: any) => {
        let itemsArr: any[] = []
        try {
          itemsArr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || []
        } catch (e) {}

        const tip = Number(o.tip || 0)
        let driverPayout = Number(o.driver_payout || 0)

        if (
          !driverPayout &&
          itemsArr.length > 0 &&
          itemsArr[0]?.billing_breakdown?.driver_payout != null
        ) {
          driverPayout = Number(itemsArr[0].billing_breakdown.driver_payout)
        }

        if (!driverPayout) {
          const deliveryFee = Number(o.delivery_fee) || 35
          driverPayout = Math.round(deliveryFee * 0.8) + tip
          if (driverPayout <= 0) driverPayout = 45
        }

        const basePay = Math.round(driverPayout * 0.7)
        const surgePay = Math.max(0, driverPayout - basePay - tip)

        return {
          id: o.id,
          order: `#${o.id.slice(0, 8)}`,
          restaurant: o.restaurant_name || 'Crave Kitchen',
          customer: o.customer_name || 'Customer',
          baseEarnings: basePay,
          surge: surgePay,
          tip,
          total: driverPayout,
          time: o.delivered_at
            ? new Date(o.delivered_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : o.created_at
              ? new Date(o.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently',
          distance: '2.4 km',
        }
      })

    return NextResponse.json({
      success: true,
      driverId,
      activeOrder: activeOrder || null,
      completedTrips,
      allAssignedOrders: driverOrders,
    })
  } catch (error: any) {
    console.error('[GET /api/driver/orders]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch driver orders' },
      { status: 500 }
    )
  }
}
