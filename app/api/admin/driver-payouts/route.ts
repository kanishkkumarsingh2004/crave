import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { listPendingDriverPayouts, updateDriverPayoutStatus } from '@/lib/dal/payments'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    const pending = await listPendingDriverPayouts()
    return NextResponse.json({ success: true, payouts: pending })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[GET /api/admin/driver-payouts]', error)
    return NextResponse.json({ error: 'Failed to load driver payouts' }, { status: 500 })
  }
}
