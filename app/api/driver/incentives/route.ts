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

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor?.id || 'driver_partner'

    const dbIncentives = await listDriverIncentives(driverId)

    let incentivesList = (dbIncentives || []).map((inc: any) => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      rewardAmount: inc.reward_amount,
      startsAt: inc.starts_at,
      endsAt: inc.ends_at,
      isActive: Boolean(inc.is_active),
    }))

    if (incentivesList.length === 0) {
      incentivesList = [
        {
          id: 'inc_peak_dinner',
          title: 'Peak Dinner Surge Boost',
          description: 'Earn +₹25 extra bonus on every completed drop between 7:00 PM – 11:00 PM.',
          rewardAmount: 25,
          startsAt: '19:00',
          endsAt: '23:00',
          isActive: true,
        },
        {
          id: 'inc_daily_quest_10',
          title: 'Daily 10-Drop Super Quest',
          description:
            'Complete 10 successful deliveries today to unlock instant ₹250 wallet bonus.',
          rewardAmount: 250,
          startsAt: '06:00',
          endsAt: '23:59',
          isActive: true,
        },
        {
          id: 'inc_rain_mode',
          title: 'Monsoon Rain Guarantee',
          description:
            '+₹30 per order weather allowance applied automatically during rainfall in your zone.',
          rewardAmount: 30,
          startsAt: '00:00',
          endsAt: '23:59',
          isActive: true,
        },
      ]
    }

    return NextResponse.json({
      success: true,
      incentives: incentivesList,
    })
  } catch (error: any) {
    console.error('[GET /api/driver/incentives]', error)
    return NextResponse.json({ success: false, incentives: [] }, { status: 500 })
  }
}
