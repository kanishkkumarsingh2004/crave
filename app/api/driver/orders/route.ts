import { NextResponse } from 'next/server'
import { listOrders } from '@/lib/dal/orders'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { calculateFullBreakdown } from '@/lib/calculator'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token)
      token =
        (await cookies()).get('crave_auth_token')?.value ||
        (await cookies()).get('drop_auth_token')?.value ||
        ''
    const actor = token ? await verifyToken(token) : null

    if (process.env.NODE_ENV !== 'test' && !actor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId =
      actor?.role === 'admin'
        ? searchParams.get('driverId') || actor?.id || 'driver_partner'
        : actor?.id || searchParams.get('driverId') || 'driver_partner'

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
        const storedBreakdown =
          o.pricing_breakdown || (itemsArr.length > 0 ? itemsArr[0]?.billing_breakdown : null)

        let basePay = 0
        let surgePay = 0
        let driverPayout = 0

        if (
          o.driver_payout != null &&
          !isNaN(Number(o.driver_payout)) &&
          Number(o.driver_payout) > 0
        ) {
          driverPayout = Number(o.driver_payout)
          basePay = Number(storedBreakdown?.driver_base_payout ?? Math.max(0, driverPayout - tip))
          surgePay = Number(storedBreakdown?.driver_surge_payout ?? 0)
        } else if (
          storedBreakdown &&
          (storedBreakdown.driver_payout != null || storedBreakdown.totalDriverEarnings != null)
        ) {
          driverPayout = Number(
            storedBreakdown.driver_payout ?? storedBreakdown.totalDriverEarnings
          )
          basePay = Number(storedBreakdown.driver_base_payout ?? Math.max(0, driverPayout - tip))
          surgePay = Number(storedBreakdown.driver_surge_payout ?? 0)
        } else {
          const foodSubtotal = Number(o.subtotal || storedBreakdown?.subtotal || 250)
          const calcResult = calculateFullBreakdown({
            subtotal: foodSubtotal,
            distanceKm: 2.4,
            tip,
          })
          const dEarnings = calcResult.driverEarnings
          basePay = dEarnings.baseDistanceShare + dEarnings.extraDistanceShare
          surgePay = dEarnings.surgeRainShare
          driverPayout = dEarnings.totalDriverEarnings
        }

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
