import { invalidateRestaurantCache, updateRestaurant } from '@/lib/dal/restaurants'
import { findUserById, updateUser } from '@/lib/dal/users'
import { verifyToken } from '@/lib/jwt'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { AdminStatsCache } from '@/lib/cache'
import { calculateMenuAppPrice } from '@/lib/menu-pricing'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function repriceRestaurantMenu(db: any, restaurantId: string) {
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      commercial_model: true,
      commission_rate: true,
      markup_rate: true,
      fixed_commission: true,
      fixed_markup: true,
      commercial_contracts: {
        where: { status: 'ACTIVE' },
        orderBy: { effective_from: 'desc' },
        take: 1,
        select: {
          commercial_model: true,
          commission_rate: true,
          markup_rate: true,
          fixed_commission: true,
          fixed_markup: true,
        },
      },
    },
  })
  const contract = restaurant?.commercial_contracts?.[0]
  const settings = {
    commercialModel: contract?.commercial_model ?? restaurant?.commercial_model,
    commissionRate: contract?.commission_rate ?? restaurant?.commission_rate,
    markupRate: contract?.markup_rate ?? restaurant?.markup_rate,
    fixedCommission: contract?.fixed_commission ?? restaurant?.fixed_commission,
    fixedMarkup: contract?.fixed_markup ?? restaurant?.fixed_markup,
  }
  const items = await db.menuItem.findMany({
    where: { restaurant_id: restaurantId },
    select: {
      id: true,
      price: true,
      restaurant_price: true,
      variants: {
        select: { id: true, price: true, restaurant_price: true },
      },
    },
  })

  for (const item of items) {
    const restaurantPrice = Number(item.restaurant_price ?? item.price)
    await db.menuItem.update({
      where: { id: item.id },
      data: {
        price: calculateMenuAppPrice(restaurantPrice, settings),
        variants: {
          update: item.variants.map((variant: any) => {
            const variantRestaurantPrice = Number(variant.restaurant_price ?? variant.price)
            return {
              where: { id: variant.id },
              data: {
                price: calculateMenuAppPrice(variantRestaurantPrice, settings),
              },
            }
          }),
        },
      },
    })
  }
}

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
      restaurantId,
      name,
      email,
      phone,
      address,
      password,
      restaurantName,
      storeName,
      cuisine,
      bannerUrl,
      commercialModel,
      commissionRate,
      commissionPercent,
      commissionFlatRs,
      markupRate,
      markupPercent,
      markupFlatRs,
      fixedCommission,
      fixedMarkup,
      paymentModel,
      vehicleType,
      vehicle_type,
      licensePlate,
      license_plate,
      latitude,
      longitude,
      isOpen,
      is_open,
    } = body

    let accountId = id ? String(id) : ''
    const requestedRestaurantId = restaurantId ? String(restaurantId) : ''
    if (!accountId && requestedRestaurantId) {
      const restaurantOwner = await prisma.restaurant.findUnique({
        where: { id: requestedRestaurantId },
        select: { owner_id: true },
      })
      accountId = restaurantOwner?.owner_id || ''
    }
    if (!accountId) {
      return NextResponse.json({ error: 'Account or restaurant ID is required.' }, { status: 400 })
    }

    // CR-14 FIX: Validate target account exists before attempting updates
    const targetUser = await findUserById(accountId)
    if (!targetUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined
    const finalStoreName = storeName || restaurantName
    const finalVehicleType = vehicleType || vehicle_type
    const finalLicensePlate = licensePlate || license_plate
    const finalIsOpen = isOpen !== undefined ? isOpen : is_open
    let cleanBannerUrl: string | null | undefined

    if (bannerUrl !== undefined) {
      const candidate = String(bannerUrl).trim()
      if (!candidate) {
        cleanBannerUrl = null
      } else {
        try {
          const parsedUrl = new URL(candidate)
          if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            throw new Error('Unsupported URL protocol')
          }
          cleanBannerUrl = parsedUrl.toString()
        } catch {
          return NextResponse.json(
            { error: 'bannerUrl must be a valid HTTP or HTTPS URL.' },
            { status: 400 }
          )
        }
      }
    }

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
      userUpdateData.password_hash = hashPassword(String(password))
    }

    // Determine if restaurant update is needed
    const needsRestaurantUpdate =
      finalStoreName ||
      cuisine ||
      bannerUrl !== undefined ||
      commercialModel !== undefined ||
      commissionRate !== undefined ||
      markupRate !== undefined ||
      fixedCommission !== undefined ||
      fixedMarkup !== undefined ||
      paymentModel ||
      address ||
      latitude !== undefined ||
      longitude !== undefined ||
      finalIsOpen !== undefined

    // CR-08 FIX: Validate commercial settings before writing to the database.
    // Storing out-of-range values silently corrupts every subsequent order for that restaurant.
    if (
      commercialModel !== undefined &&
      !['commission', 'markup', 'hybrid'].includes(String(commercialModel))
    ) {
      return NextResponse.json({ error: 'Invalid commercial model.' }, { status: 400 })
    }
    for (const [field, value] of Object.entries({ commissionRate, markupRate })) {
      if (value === undefined) continue
      const rate = Number(value)
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: `${field} must be a number between 0 and 100 (percent).` },
          { status: 400 }
        )
      }
    }
    for (const [field, value] of Object.entries({ fixedCommission, fixedMarkup })) {
      if (value === undefined) continue
      const amount = Number(value)
      if (!Number.isInteger(amount) || amount < 0) {
        return NextResponse.json(
          { error: `${field} must be a non-negative whole rupee amount.` },
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

    try {
      if (needsTransaction) {
        // Use transaction for atomicity
        await prisma.$transaction(async (tx) => {
          // Update User
          if (Object.keys(userUpdateData).length > 0) {
            await tx.user.update({
              where: { id: accountId },
              data: userUpdateData,
            })
          }

          // Update Restaurant (if needed)
          if (needsRestaurantUpdate) {
            const restUpdateData: Record<string, any> = {}
            if (finalStoreName) restUpdateData.name = String(finalStoreName).trim()
            if (cuisine) restUpdateData.cuisine = String(cuisine).trim()
            if (bannerUrl !== undefined) restUpdateData.image = cleanBannerUrl
            if (address) restUpdateData.address = String(address).trim()
            if (phone) restUpdateData.phone = String(phone).trim()
            if (commercialModel !== undefined)
              restUpdateData.commercial_model = String(commercialModel)
            if (commissionRate !== undefined)
              restUpdateData.commission_rate = Number(commissionRate)
            if (commissionPercent !== undefined)
              restUpdateData.commission_rate = Number(commissionPercent)
            if (commissionFlatRs !== undefined)
              restUpdateData.fixed_commission = Number(commissionFlatRs)
            if (markupRate !== undefined) restUpdateData.markup_rate = Number(markupRate)
            if (markupPercent !== undefined) restUpdateData.markup_rate = Number(markupPercent)
            if (fixedCommission !== undefined)
              restUpdateData.fixed_commission = Number(fixedCommission)
            if (markupFlatRs !== undefined) restUpdateData.fixed_markup = Number(markupFlatRs)
            if (fixedMarkup !== undefined) restUpdateData.fixed_markup = Number(fixedMarkup)
            if (paymentModel) restUpdateData.payment_model = String(paymentModel).trim()
            if (latitude !== undefined) restUpdateData.latitude = Number(latitude)
            if (longitude !== undefined) restUpdateData.longitude = Number(longitude)
            if (finalIsOpen !== undefined) restUpdateData.is_open = Boolean(finalIsOpen)

            let targetRestId = requestedRestaurantId || accountId
            if (typeof tx?.restaurant?.findFirst === 'function') {
              const foundRest = await tx.restaurant
                .findFirst({
                  where: {
                    OR: [
                      ...(requestedRestaurantId ? [{ id: requestedRestaurantId }] : []),
                      { id: accountId },
                      { owner_id: accountId },
                    ],
                  },
                  select: { id: true },
                })
                .catch(() => null)
              if (foundRest?.id) {
                targetRestId = foundRest.id
              }
            }

            await tx.restaurant.update({
              where: { id: targetRestId },
              data: restUpdateData,
            })
            if (
              commercialModel !== undefined ||
              commissionRate !== undefined ||
              commissionPercent !== undefined ||
              commissionFlatRs !== undefined ||
              markupRate !== undefined ||
              markupPercent !== undefined ||
              fixedCommission !== undefined ||
              fixedMarkup !== undefined ||
              markupFlatRs !== undefined
            ) {
              await tx.commercialContract.updateMany({
                where: { restaurant_id: targetRestId, status: 'ACTIVE' },
                data: {
                  ...(commercialModel !== undefined && {
                    commercial_model: String(commercialModel) as any,
                  }),
                  ...(commissionRate !== undefined && { commission_rate: Number(commissionRate) }),
                  ...(commissionPercent !== undefined && {
                    commission_rate: Number(commissionPercent),
                  }),
                  ...(commissionFlatRs !== undefined && {
                    fixed_commission: Number(commissionFlatRs),
                  }),
                  ...(markupRate !== undefined && { markup_rate: Number(markupRate) }),
                  ...(markupPercent !== undefined && { markup_rate: Number(markupPercent) }),
                  ...(fixedCommission !== undefined && {
                    fixed_commission: Number(fixedCommission),
                  }),
                  ...(markupFlatRs !== undefined && { fixed_markup: Number(markupFlatRs) }),
                  ...(fixedMarkup !== undefined && { fixed_markup: Number(fixedMarkup) }),
                },
              })
              await repriceRestaurantMenu(tx, targetRestId)
            }
          }
        })
        await invalidateRestaurantCache()
      } else {
        // Single table updates (no transaction needed for single table)
        if (Object.keys(userUpdateData).length > 0) {
          await updateUser(accountId, userUpdateData)
        }
        if (needsRestaurantUpdate) {
          const restUpdateData: Record<string, any> = {}
          if (finalStoreName) restUpdateData.name = String(finalStoreName).trim()
          if (cuisine) restUpdateData.cuisine = String(cuisine).trim()
          if (bannerUrl !== undefined) restUpdateData.image = cleanBannerUrl
          if (address) restUpdateData.address = String(address).trim()
          if (phone) restUpdateData.phone = String(phone).trim()
          if (commercialModel !== undefined)
            restUpdateData.commercial_model = String(commercialModel)
          if (commissionRate !== undefined) restUpdateData.commission_rate = Number(commissionRate)
          if (commissionPercent !== undefined)
            restUpdateData.commission_rate = Number(commissionPercent)
          if (commissionFlatRs !== undefined)
            restUpdateData.fixed_commission = Number(commissionFlatRs)
          if (markupRate !== undefined) restUpdateData.markup_rate = Number(markupRate)
          if (markupPercent !== undefined) restUpdateData.markup_rate = Number(markupPercent)
          if (fixedCommission !== undefined)
            restUpdateData.fixed_commission = Number(fixedCommission)
          if (markupFlatRs !== undefined) restUpdateData.fixed_markup = Number(markupFlatRs)
          if (fixedMarkup !== undefined) restUpdateData.fixed_markup = Number(fixedMarkup)
          if (paymentModel) restUpdateData.payment_model = String(paymentModel).trim()
          if (latitude !== undefined) restUpdateData.latitude = Number(latitude)
          if (longitude !== undefined) restUpdateData.longitude = Number(longitude)
          if (finalIsOpen !== undefined) restUpdateData.is_open = Boolean(finalIsOpen)

          let targetRestId = requestedRestaurantId || accountId
          if (typeof prisma?.restaurant?.findFirst === 'function') {
            const foundRest = await prisma.restaurant
              .findFirst({
                where: {
                  OR: [
                    ...(requestedRestaurantId ? [{ id: requestedRestaurantId }] : []),
                    { id: accountId },
                    { owner_id: accountId },
                  ],
                },
                select: { id: true },
              })
              .catch(() => null)
            if (foundRest?.id) {
              targetRestId = foundRest.id
            }
          }

          await updateRestaurant(targetRestId, restUpdateData)
          if (
            commercialModel !== undefined ||
            commissionRate !== undefined ||
            commissionPercent !== undefined ||
            commissionFlatRs !== undefined ||
            markupRate !== undefined ||
            markupPercent !== undefined ||
            fixedCommission !== undefined ||
            fixedMarkup !== undefined ||
            markupFlatRs !== undefined
          ) {
            await prisma.commercialContract.updateMany({
              where: { restaurant_id: targetRestId, status: 'ACTIVE' },
              data: {
                ...(commercialModel !== undefined && {
                  commercial_model: String(commercialModel) as any,
                }),
                ...(commissionRate !== undefined && { commission_rate: Number(commissionRate) }),
                ...(commissionPercent !== undefined && {
                  commission_rate: Number(commissionPercent),
                }),
                ...(commissionFlatRs !== undefined && {
                  fixed_commission: Number(commissionFlatRs),
                }),
                ...(markupRate !== undefined && { markup_rate: Number(markupRate) }),
                ...(markupPercent !== undefined && { markup_rate: Number(markupPercent) }),
                ...(fixedCommission !== undefined && {
                  fixed_commission: Number(fixedCommission),
                }),
                ...(markupFlatRs !== undefined && { fixed_markup: Number(markupFlatRs) }),
                ...(fixedMarkup !== undefined && { fixed_markup: Number(fixedMarkup) }),
              },
            })
            await repriceRestaurantMenu(prisma, targetRestId)
          }
        }
      }
    } catch (dbErr: any) {
      throw dbErr
    }

    await AdminStatsCache.invalidateDailyStats(new Date().toISOString().split('T')[0])

    // Broadcast WebSocket updates
    broadcast('admin_users', {
      type: 'user_update',
      id: accountId,
      timestamp: new Date().toISOString(),
    })
    broadcast('admin_stats', { type: 'stats_update', timestamp: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: 'Account details successfully updated.',
      updated: { id: accountId, ...userUpdateData },
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
