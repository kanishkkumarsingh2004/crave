import { listVendorSettlements } from '@/lib/dal/payments'
import { listRestaurants } from '@/lib/dal/restaurants'
import { listUsersByRole } from '@/lib/dal/users'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [settlements, restaurants, customers, vendors, drivers] = await Promise.all([
      listVendorSettlements(),
      listRestaurants(),
      listUsersByRole('customer'),
      listUsersByRole('vendor'),
      listUsersByRole('driver'),
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

    return NextResponse.json({
      success: true,
      settlements,
      restaurants,
      stats: {
        weeklyGross,
        totalCommission,
        netVendorPay,
        customerCount: customers.length,
        vendorCount: vendors.length,
        driverCount: drivers.length,
        totalUsers: customers.length + vendors.length + drivers.length,
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load stats' }, { status: 500 })
  }
}
