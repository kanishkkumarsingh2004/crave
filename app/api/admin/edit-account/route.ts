import { updateUser, findUserById } from '@/lib/dal/users'
import { updateRestaurant } from '@/lib/dal/restaurants'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { broadcast } from '@/lib/ws-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    // CR-14 FIX: Validate target account exists before attempting updates
    const targetUser = await findUserById(id)
    if (!targetUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
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
      let targetEmail = cleanEmail
      if (!targetEmail) {
        targetEmail = targetUser.email
      }
      if (targetEmail) {
        userUpdateData.password_hash = crypto
          .scryptSync(String(password), targetEmail, 64)
          .toString('hex')
      }
    }

    // Determine if restaurant update is needed
    const needsRestaurantUpdate =
      finalStoreName ||
      cuisine ||
      commissionRate !== undefined ||
      paymentModel ||
      address ||
      latitude !== undefined ||
      longitude !== undefined

    // CR-08 FIX: Validate commercial settings before writing to the database.
    // Storing out-of-range values silently corrupts every subsequent order for that restaurant.
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate)
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: 'commissionRate must be a number between 0 and 100 (percent).' },
          { status: 400 }
        )
      }
    }
    if (latitude !== undefined) {
      const lat = Number(latitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'latitude must be a valid decimal between -90 and 90.' },
          { status: 400 }
        )
      }
    }
    if (longitude !== undefined) {
      const lng = Number(longitude)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'longitude must be a valid decimal between -180 and 180.' },
          { status: 400 }
        )
      }
    }

    // CR-14 FIX: Use Prisma transaction for atomic updates
    // Both user and restaurant updates must succeed or both roll back
    const needsTransaction = Object.keys(userUpdateData).length > 0 && needsRestaurantUpdate

    let userResult: any = null
    let restaurantResult: any = null

    if (needsTransaction) {
      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Update User
        if (Object.keys(userUpdateData).length > 0) {
          userResult = await tx.user.update({
            where: { id },
            data: userUpdateData,
          })
        } else {
          userResult = targetUser
        }

        // Update Restaurant (if needed)
        if (needsRestaurantUpdate) {
          const restUpdateData: Record<string, any> = {}
          if (finalStoreName) restUpdateData.name = String(finalStoreName).trim()
          if (cuisine) restUpdateData.cuisine = String(cuisine).trim()
          if (address) restUpdateData.address = String(address).trim()
          if (phone) restUpdateData.phone = String(phone).trim()
          if (commissionRate !== undefined) restUpdateData.commission_rate = Number(commissionRate)
          if (paymentModel) restUpdateData.payment_model = String(paymentModel).trim()
          if (latitude !== undefined) restUpdateData.latitude = Number(latitude)
          if (longitude !== undefined) restUpdateData.longitude = Number(longitude)

          let targetRestId = id
          if (typeof tx?.restaurant?.findFirst === 'function') {
            const foundRest = await tx.restaurant
              .findFirst({
                where: { OR: [{ id }, { owner_id: id }] },
                select: { id: true },
              })
              .catch(() => null)
            if (foundRest?.id) {
              targetRestId = foundRest.id
            }
          }

          restaurantResult = await tx.restaurant.update({
            where: { id: targetRestId },
            data: restUpdateData,
          })
        }
      })
    } else {
      // Single table updates (no transaction needed for single table)
      if (Object.keys(userUpdateData).length > 0) {
        userResult = await updateUser(id, userUpdateData)
      } else {
        userResult = targetUser
      }
      if (needsRestaurantUpdate) {
        const restUpdateData: Record<string, any> = {}
        if (finalStoreName) restUpdateData.name = String(finalStoreName).trim()
        if (cuisine) restUpdateData.cuisine = String(cuisine).trim()
        if (address) restUpdateData.address = String(address).trim()
        if (phone) restUpdateData.phone = String(phone).trim()
        if (commissionRate !== undefined) restUpdateData.commission_rate = Number(commissionRate)
        if (paymentModel) restUpdateData.payment_model = String(paymentModel).trim()
        if (latitude !== undefined) restUpdateData.latitude = Number(latitude)
        if (longitude !== undefined) restUpdateData.longitude = Number(longitude)

        let targetRestId = id
        if (typeof prisma?.restaurant?.findFirst === 'function') {
          const foundRest = await prisma.restaurant
            .findFirst({
              where: { OR: [{ id }, { owner_id: id }] },
              select: { id: true },
            })
            .catch(() => null)
          if (foundRest?.id) {
            targetRestId = foundRest.id
          }
        }

        restaurantResult = await updateRestaurant(targetRestId, restUpdateData)
      }
    }

    // Broadcast WebSocket updates
    broadcast('admin_users', { type: 'user_update', id, timestamp: new Date().toISOString() })
    broadcast('admin_stats', { type: 'stats_update', timestamp: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: 'Account details successfully updated.',
      updated: { id, ...userUpdateData },
      restaurantUpdated: needsRestaurantUpdate,
    })
  } catch (error: any) {
    console.error('Error updating account:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update account' },
      { status: 500 }
    )
  }
}
