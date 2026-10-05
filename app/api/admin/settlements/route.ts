import { listVendorSettlements, updateVendorSettlementStatus } from '@/lib/dal/payments'
import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

    const settlements = await prisma.vendorSettlement.findMany({
      orderBy: { payout_date: 'desc' },
      include: { restaurant: true },
    })
    return NextResponse.json({ success: true, settlements })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load settlements' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, commission_rate, restaurant_id } = body

    if (id && status) {
      await updateVendorSettlementStatus(id, status)
    }

    if (restaurant_id && commission_rate != null) {
      await prisma.restaurant.update({
        where: { id: restaurant_id },
        data: { commission_rate: Number(commission_rate) },
      })
    }

    broadcast('admin_settlements', {
      type: 'update',
      id,
      status,
      commission_rate,
      restaurant_id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: 'Settlement updated successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update settlement' },
      { status: 500 }
    )
  }
}
