import { listVendorSettlements, updateVendorSettlementStatus } from '@/lib/dal/payments'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
    const body = await request.json()
    const { id, status, commission_rate, restaurant_id } = body

    if (id && status) {
      await updateVendorSettlementStatus(id, status)
    }

    if (restaurant_id && commission_rate != null) {
      try {
        await prisma.restaurant.update({
          where: { id: restaurant_id },
          data: { commission_rate: Number(commission_rate) },
        })
      } catch {
        try {
          await supabase
            .from('restaurants')
            .update({ commission_rate: Number(commission_rate) })
            .eq('id', restaurant_id)
        } catch {}
      }
    }

    return NextResponse.json({ success: true, message: 'Settlement updated successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update settlement' },
      { status: 500 }
    )
  }
}
