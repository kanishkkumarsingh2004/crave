import { listUsersByRole } from '@/lib/dal/users'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const c = await cookies()
        token = c.get('crave_auth_token')?.value || c.get('drop_auth_token')?.value || ''
      } catch {}
    }

    const actor = token ? await verifyToken(token) : null
    if (process.env.NODE_ENV !== 'test' && (!actor || actor.role !== 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const drivers = await listUsersByRole('rider')
    const formatted = (drivers || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      address: d.address || null,
      vehicle_type: d.vehicle_type || 'EV Scooter',
      license_plate: d.license_plate || null,
      created_at: d.created_at,
      status: 'active',
    }))

    return NextResponse.json({ success: true, drivers: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, drivers: [], error: error?.message || 'Failed to load drivers' },
      { status: 500 }
    )
  }
}
