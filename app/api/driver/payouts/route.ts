import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { createDriverPayout, listDriverPayouts } from '@/lib/dal/payments'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'rider' && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Rider access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = actor.role === 'admin' ? searchParams.get('driverId') || actor.id : actor.id

    const payouts = await listDriverPayouts(driverId)
    const formatted = (payouts || []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      date: p.created_at
        ? new Date(p.created_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recently',
      status:
        p.status === 'completed' || p.status === 'success'
          ? `Transferred to UPI (${p.transaction_ref || 'Instant NPCI Payout'})`
          : p.status || 'Processed',
    }))

    return NextResponse.json({ success: true, payoutLogs: formatted })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[GET /api/driver/payouts]', error)
    return NextResponse.json({ success: false, payoutLogs: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'rider' && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Rider access required' }, { status: 403 })
    }

    const body = await request.json()
    const { amount, driverId: bodyDriverId } = body
    const driverId = actor.role === 'admin' ? bodyDriverId || actor.id : actor.id

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid payout amount required' }, { status: 400 })
    }

    const id = `tx_${crypto.randomUUID().slice(0, 8)}`
    const created = await createDriverPayout({
      id,
      driver_id: driverId,
      amount: Number(amount),
      status: actor.role === 'admin' ? 'paid' : 'pending',
      transaction_ref: actor.role === 'admin' ? `UPI_${Date.now()}` : undefined,
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: created.id,
        amount: created.amount,
        date: 'Just Now',
        status: created.status,
      },
    })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[POST /api/driver/payouts]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process payout request' },
      { status: 500 }
    )
  }
}
