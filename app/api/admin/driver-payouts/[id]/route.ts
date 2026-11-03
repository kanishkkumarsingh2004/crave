import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { updateDriverPayoutStatus } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const { status, transaction_ref } = body

    if (status !== 'paid' && status !== 'failed') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (status === 'paid' && (typeof transaction_ref !== 'string' || !transaction_ref.trim())) {
      return NextResponse.json(
        { error: 'A Razorpay provider transfer ID is required to confirm payment' },
        { status: 400 }
      )
    }

    const updated = await updateDriverPayoutStatus(id, status, transaction_ref?.trim())
    return NextResponse.json({ success: true, payout: updated })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[PATCH /api/admin/driver-payouts/[id]]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update driver payout' },
      { status: error?.statusCode || 500 }
    )
  }
}
