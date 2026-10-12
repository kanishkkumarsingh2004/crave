import { NextResponse } from 'next/server'
import { createDriverPayout, listDriverPayouts } from '@/lib/dal/payments'
import { requireAuthApi, handleApiAuthError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor.id

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

    const body = await request.json()
    const { amount, vpa, driverId: bodyDriverId } = body

    // XP-08 FIX (1): Ownership + role check.
    // A driver can only request a payout for themselves. Admins may specify any driverId.
    const requestedDriverId = bodyDriverId || actor.id
    if (actor.role !== 'admin' && actor.role !== 'rider' && actor.role !== 'driver') {
      return NextResponse.json({ error: 'Forbidden: Only drivers or admins can request payouts' }, { status: 403 })
    }
    if (actor.role !== 'admin' && requestedDriverId !== actor.id) {
      return NextResponse.json({ error: 'Forbidden: You can only request your own payouts' }, { status: 403 })
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid payout amount required' }, { status: 400 })
    }

    // XP-08 FIX (2): Basic balance guard \u2014 fetch existing payouts and compare against a
    // driver's total earnings. Uses completed DriverPayout rows as a proxy for cleared balance.
    // This prevents overdrafts even when a proper ledger balance endpoint is not yet wired.
    const existingPayouts = await listDriverPayouts(requestedDriverId)
    const alreadyPaidOut = existingPayouts
      .filter((p: any) => p.status === 'paid' || p.status === 'completed' || p.status === 'pending')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    // Fetch driver earnings from completed orders to determine available balance
    const driverOrders = await prisma.order.findMany({
      where: { rider_id: requestedDriverId, status: { in: ['delivered', 'completed'] } },
      select: { driver_payout: true },
    })
    const totalEarnings = driverOrders.reduce(
      (sum: number, o: any) => sum + Number(o.driver_payout || 0),
      0
    )
    const availableBalance = Math.max(0, totalEarnings - alreadyPaidOut)

    if (Number(amount) > availableBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: ₹${availableBalance.toFixed(2)}, Requested: ₹${Number(amount).toFixed(2)}`,
        },
        { status: 422 }
      )
    }

    const id = `tx_${crypto.randomUUID().slice(0, 8)}`
    // XP-08 FIX (3): Status set to 'pending', not 'paid'. The payout is not complete until
    // the payment gateway confirms. Marking it 'paid' immediately creates a ghost balance.
    const created = await createDriverPayout({
      id,
      driver_id: requestedDriverId,
      amount: Number(amount),
      status: 'pending',
      transaction_ref: `UPI_${Date.now()}`,
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
