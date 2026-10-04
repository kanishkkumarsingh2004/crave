import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Vendor settlements
    const settlements = await prisma.vendorSettlement.findMany({
      orderBy: { payout_date: 'desc' },
    })

    // Restaurants
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { created_at: 'desc' },
    })

    // User counts by role
    const users = await prisma.user.findMany({ select: { role: true } })
    const customerCount = users.filter((u) => u.role === 'customer').length
    const vendorCount = users.filter((u) => u.role === 'vendor').length
    const driverCount = users.filter((u) => u.role === 'driver').length

    // Aggregate settlement financials
    const weeklyGross = settlements.reduce((sum, row) => sum + Number(row.gross_sales ?? 0), 0)
    const totalCommission = settlements.reduce(
      (sum, row) => sum + Number(row.commission_amount ?? 0),
      0
    )
    const netVendorPay = settlements.reduce((sum, row) => sum + Number(row.net_payout ?? 0), 0)

    return NextResponse.json({
      success: true,
      settlements,
      restaurants,
      stats: {
        weeklyGross,
        totalCommission,
        netVendorPay,
        customerCount,
        vendorCount,
        driverCount,
        totalUsers: users.length,
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load stats' }, { status: 500 })
  }
}
