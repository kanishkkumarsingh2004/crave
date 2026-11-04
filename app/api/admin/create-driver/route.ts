import { createUser, findUserByEmail } from '@/lib/dal'
import { getAuthActor } from '@/lib/auth/auth-helpers'
import { broadcast } from '@/lib/ws-server'
import { hashPassword } from '@/lib/password'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const actor = await getAuthActor(request)
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      phone,
      address,
      vehicle_type,
      vehicleType,
      license_plate,
      licensePlate,
    } = body

    const finalVehicleType = vehicle_type || vehicleType || 'Electric Bike'
    const finalLicensePlate = license_plate || licensePlate || null

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Driver name, email, and password are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // Pre-check for existing account email
    const existingUser = await findUserByEmail(cleanEmail)

    if (existingUser) {
      return NextResponse.json(
        {
          error: `An account with email '${cleanEmail}' is already registered in the system (Role: ${existingUser.role}).`,
        },
        { status: 400 }
      )
    }

    const driverUserId = `usr_driver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const passwordHash = hashPassword(password)

    // Insert rider user record via Prisma DAL
    await createUser({
      id: driverUserId,
      name: String(name).trim(),
      email: cleanEmail,
      role: 'rider',
      password_hash: passwordHash,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      vehicle_type: String(finalVehicleType).trim(),
      license_plate: finalLicensePlate ? String(finalLicensePlate).trim() : null,
    })

    // Broadcast real-time driver onboarding to WebSocket listeners
    broadcast('admin_stats', {
      type: 'user_signup',
      role: 'rider',
      user: { id: driverUserId, name: String(name).trim(), email: cleanEmail, role: 'rider' },
      timestamp: new Date().toISOString(),
    })
    broadcast('admin_users', {
      type: 'user_signup',
      user: { id: driverUserId, name: String(name).trim(), email: cleanEmail, role: 'rider' },
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Delivery driver '${name}' successfully onboarded!`,
      driver: {
        id: driverUserId,
        name: String(name).trim(),
        email: cleanEmail,
        phone: phone || undefined,
        role: 'rider',
        vehicle_type: finalVehicleType,
        license_plate: finalLicensePlate,
      },
    })
  } catch (error: any) {
    console.error('Error in create-driver endpoint:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to onboard driver' },
      { status: 500 }
    )
  }
}
