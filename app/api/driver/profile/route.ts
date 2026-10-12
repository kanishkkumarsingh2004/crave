import { NextResponse } from 'next/server'
import { findUserById, updateUser } from '@/lib/dal/users'
import { requireAuthApi, handleApiAuthError } from '@/lib/api-auth'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor.id

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    if (actor.role !== 'admin' && actor.id !== driverId) {
      return NextResponse.json({ error: 'Unauthorized to view this driver profile' }, { status: 403 })
    }

    const user = await findUserById(driverId)
    if (!user) {
      return NextResponse.json({ error: 'Driver user profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        vehicleType: user.vehicle_type || 'Commercial EV Delivery Scooter',
        licensePlate: user.license_plate || 'KA-01-EV-9876',
        vehicleNo: user.license_plate || 'EV Fleet Vehicle',
        role: user.role,
        zone: 'Indiranagar & Koramangala, Bengaluru',
        kycStatus: 'Verified Partner',
      },
    })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[GET /api/driver/profile]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load driver profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const body = await request.json()
    const driverId = body.driverId || actor.id

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID required' }, { status: 400 })
    }

    if (actor.role !== 'admin' && actor.id !== driverId) {
      return NextResponse.json({ error: 'Unauthorized to update this driver profile' }, { status: 403 })
    }

    const { name, phone, address, vehicleType, licensePlate } = body

    const updated = await updateUser(driverId, {
      ...(name && { name: String(name).trim() }),
      ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
      ...(address !== undefined && { address: address ? String(address).trim() : null }),
      ...(vehicleType && { vehicle_type: String(vehicleType).trim() }),
      ...(licensePlate && { license_plate: String(licensePlate).trim() }),
    })

    return NextResponse.json({
      success: true,
      message: 'Driver profile updated successfully',
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        address: updated.address || '',
        vehicleType: updated.vehicle_type || 'Commercial EV Delivery Scooter',
        licensePlate: updated.license_plate || 'KA-01-EV-9876',
        role: updated.role,
      },
    })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[PUT /api/driver/profile]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update driver profile' },
      { status: 500 }
    )
  }
}
