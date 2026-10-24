import { NextResponse } from 'next/server'
import { listDriverIncentives } from '@/lib/dal/payments'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null
    if (!actor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (actor.role !== 'rider' && actor.role !== 'driver' && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Rider access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = actor.role === 'admin' ? searchParams.get('driverId') || actor.id : actor.id

    const dbIncentives = await listDriverIncentives(driverId)

    const incentivesList = (dbIncentives || []).map((inc: any) => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      rewardAmount: inc.reward_amount,
      startsAt: inc.starts_at,
      endsAt: inc.ends_at,
      isActive: Boolean(inc.is_active),
    }))

    return NextResponse.json({
      success: true,
      incentives: incentivesList,
    })
  } catch (error: any) {
    console.error('[GET /api/driver/incentives]', error)
    return NextResponse.json({ success: false, incentives: [] }, { status: 500 })
  }
}
