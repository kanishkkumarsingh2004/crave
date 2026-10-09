import { listUsersByRole } from '@/lib/dal/users'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
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
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
