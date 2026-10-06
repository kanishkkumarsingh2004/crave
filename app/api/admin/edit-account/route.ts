import { updateUser } from '@/lib/dal/users'
import { updateRestaurant } from '@/lib/dal/restaurants'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { broadcast } from '@/lib/ws-server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers?.get ? request.headers.get('authorization') : null
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      name,
      email,
      phone,
      address,
      password,
      restaurantName,
      storeName,
      cuisine,
      commissionRate,
      paymentModel,
      vehicleType,
      vehicle_type,
      licensePlate,
      license_plate,
      latitude,
      longitude,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 })
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined
    const finalStoreName = storeName || restaurantName
    const finalVehicleType = vehicleType || vehicle_type
    const finalLicensePlate = licensePlate || license_plate

    // Prepare User update payload
    const userUpdateData: Record<string, any> = {}
    if (name !== undefined) userUpdateData.name = String(name).trim()
    if (cleanEmail !== undefined) userUpdateData.email = cleanEmail
    if (phone !== undefined) userUpdateData.phone = phone ? String(phone).trim() : null
    if (address !== undefined) userUpdateData.address = address ? String(address).trim() : null
    if (finalStoreName !== undefined) userUpdateData.restaurant_name = String(finalStoreName).trim()
    if (cuisine !== undefined) userUpdateData.cuisine = String(cuisine).trim()
    if (finalVehicleType !== undefined)
      userUpdateData.vehicle_type = String(finalVehicleType).trim()
    if (finalLicensePlate !== undefined)
      userUpdateData.license_plate = finalLicensePlate ? String(finalLicensePlate).trim() : null

    if (password && String(password).trim().length > 0) {
      const targetEmail = cleanEmail || 'user@crave.com'
      userUpdateData.password_hash = crypto
        .scryptSync(String(password), targetEmail, 64)
        .toString('hex')
    }

    // Update User record in database
    try {
      await updateUser(id, userUpdateData)
    } catch (e) {
      console.warn('User table update notice:', e)
    }

    // If account has restaurant/vendor attributes, also update restaurant record
    if (
      finalStoreName ||
      cuisine ||
      commissionRate !== undefined ||
      paymentModel ||
      address ||
      latitude !== undefined ||
      longitude !== undefined
    ) {
      const restUpdateData: Record<string, any> = {}
      if (finalStoreName) restUpdateData.name = String(finalStoreName).trim()
      if (cuisine) restUpdateData.cuisine = String(cuisine).trim()
      if (address) restUpdateData.address = String(address).trim()
      if (phone) restUpdateData.phone = String(phone).trim()
      if (commissionRate !== undefined) restUpdateData.commission_rate = Number(commissionRate)
      if (paymentModel) restUpdateData.payment_model = String(paymentModel).trim()
      if (latitude !== undefined) restUpdateData.latitude = Number(latitude)
      if (longitude !== undefined) restUpdateData.longitude = Number(longitude)

      try {
        await updateRestaurant(id, restUpdateData)
      } catch (e) {
        console.warn('Restaurant table update notice:', e)
      }
    }

    // Broadcast WebSocket updates
    broadcast('admin_users', { type: 'user_update', id, timestamp: new Date().toISOString() })
    broadcast('admin_stats', { type: 'stats_update', timestamp: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: 'Account details successfully updated.',
      updated: { id, ...userUpdateData },
    })
  } catch (error: any) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update account' },
      { status: 500 }
    )
  }
}
