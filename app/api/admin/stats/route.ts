import { listVendorSettlements } from '@/lib/dal/payments'
import { listRestaurants } from '@/lib/dal/restaurants'
import { listUsersByRole } from '@/lib/dal/users'
import { countOrders, listOrders } from '@/lib/dal/orders'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AdminStatsCache } from '@/lib/cache'

export async function GET(request?: Request) {
  try {
    if (request) {
      const authHeader = request.headers.get('authorization')
      let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
      if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

      const payload = token ? await verifyToken(token) : null
      if (!payload || payload.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    // Try to get cached stats first
    const today = new Date().toISOString().split('T')[0]
    const cachedStats = await AdminStatsCache.getDailyStats(today)
    if (cachedStats) {
      return NextResponse.json({ success: true, ...cachedStats })
    }

    const [settlements, restaurants, customers, vendors, drivers, orders, totalCount] =
      await Promise.all([
        listVendorSettlements(),
        listRestaurants(),
        listUsersByRole('user'),
        listUsersByRole('restaurant_vendor'),
        listUsersByRole('rider'),
        listOrders(),
        countOrders(),
      ])

    const weeklyGross = (settlements || []).reduce(
      (sum: number, row: any) => sum + Number(row.gross_sales ?? 0),
      0
    )
    const totalCommission = (settlements || []).reduce(
      (sum: number, row: any) => sum + Number(row.commission_amount ?? 0),
      0
    )
    const netVendorPay = (settlements || []).reduce(
      (sum: number, row: any) => sum + Number(row.net_payout ?? 0),
      0
    )
    const weeklyOrderRevenue = (orders || []).reduce(
      (sum: number, row: any) => sum + Number(row.total_amount ?? 0),
      0
    )

    const stats = {
      weeklyGross,
      weeklyRevenue: weeklyOrderRevenue,
      orderCount: totalCount,
      totalCommission,
      netVendorPay,
      customerCount: customers.length,
      vendorCount: vendors.length,
      driverCount: drivers.length,
      totalUsers: customers.length + vendors.length + drivers.length,
      restaurantCount: restaurants.length,
      liveDevices: Math.max(1, customers.length + vendors.length + drivers.length),
    }

    // Cache the stats for the day
    await AdminStatsCache.setDailyStats(new Date().toISOString().split('T')[0], {
      success: true,
      settlements,
      restaurants,
      orders,
      stats: {
        weeklyGross,
        weeklyRevenue: weeklyOrderRevenue,
        orderCount: totalCount,
        totalCommission,
        netVendorPay,
        customerCount: customers.length,
        vendorCount: vendors.length,
        driverCount: drivers.length,
        totalUsers: customers.length + vendors.length + drivers.length,
        restaurantCount: restaurants.length,
        liveDevices: Math.max(1, customers.length + vendors.length + drivers.length),
      },
    })

    return NextResponse.json({
      success: true,
      settlements,
      restaurants,
      orders,
      stats: {
        weeklyGross,
        weeklyRevenue: weeklyOrderRevenue,
        orderCount: totalCount,
        totalCommission,
        netVendorPay,
        customerCount: customers.length,
        vendorCount: vendors.length,
        driverCount: drivers.length,
        totalUsers: customers.length + vendors.length + drivers.length,
        restaurantCount: restaurants.length,
        liveDevices: Math.max(1, customers.length + vendors.length + drivers.length),
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load stats' }, { status: 500 })
  }
}
