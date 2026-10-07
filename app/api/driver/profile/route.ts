import { NextResponse } from 'next/server'
import { findUserById, updateUser } from '@/lib/dal/users'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor?.id

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
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
    console.error('[GET /api/driver/profile]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load driver profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null

    const body = await request.json()
    const driverId = body.driverId || actor?.id

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID required' }, { status: 400 })
    }

    const { name, phone, address, vehicleType, licensePlate } = body

    const updated = await updateUser(driverId, {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(vehicleType && { vehicle_type: vehicleType }),
      ...(licensePlate && { license_plate: licensePlate }),
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
    console.error('[PUT /api/driver/profile]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update driver profile' },
      { status: 500 }
    )
  }
}
