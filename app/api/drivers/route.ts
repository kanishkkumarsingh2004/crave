import { listUsersByRole } from '@/lib/dal/users'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
