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

    const updated = await updateDriverPayoutStatus(
      id,
      status,
      transaction_ref || (status === 'paid' ? `UPI_${Date.now()}` : undefined)
    )
    return NextResponse.json({ success: true, payout: updated })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[PATCH /api/admin/driver-payouts/[id]]', error)
    return NextResponse.json({ error: 'Failed to update driver payout' }, { status: 500 })
  }
}
