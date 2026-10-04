import { prisma } from '@/lib/prisma'
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
