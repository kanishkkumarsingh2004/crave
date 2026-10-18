import { findUserByEmail } from '@/lib/dal'
import { invalidateRestaurantCache } from '@/lib/dal/restaurants'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { AdminStatsCache } from '@/lib/cache'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { vendorId, userId, email } = body

    if (!vendorId && !userId && !email) {
      return NextResponse.json(
        { error: 'Vendor ID, user ID, or email is required to delete vendor.' },
        { status: 400 }
      )
    }

    let targetUserId = userId
    let targetVendorId = vendorId

    // If vendorId starts with usr_, it's a user ID
    if (targetVendorId && targetVendorId.startsWith('usr_') && !targetUserId) {
      targetUserId = targetVendorId
      targetVendorId = undefined
    }

    // Resolve exact database records before mutating anything.
    if (!targetUserId && email) {
      const user = await findUserByEmail(email)
      if (user) targetUserId = user.id
    }

    if (targetUserId && !targetVendorId) {
      const rest = await prisma.restaurant.findFirst({
        where: { owner_id: targetUserId },
        select: { id: true },
      })
      if (rest) targetVendorId = rest.id
    }

    if (targetVendorId && !targetUserId) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: targetVendorId },
        select: { owner_id: true },
      })
      if (rest?.owner_id) targetUserId = rest.owner_id
    }

    if (!targetVendorId && !targetUserId) {
      return NextResponse.json({ error: 'Vendor account not found.' }, { status: 404 })
    }

    const [vendorOrderCount, userOrderCount] = await Promise.all([
      targetVendorId
        ? prisma.order.count({ where: { restaurant_id: targetVendorId } })
        : Promise.resolve(0),
      targetUserId
        ? prisma.order.count({ where: { customer_id: targetUserId } })
        : Promise.resolve(0),
    ])
    const mustPreserveHistory = vendorOrderCount > 0 || userOrderCount > 0

    if (mustPreserveHistory && targetVendorId) {
      await prisma.$transaction([
        prisma.restaurant.update({
          where: { id: targetVendorId },
          data: { is_open: false },
        }),
        prisma.menuItem.updateMany({
          where: { restaurant_id: targetVendorId },
          data: { in_stock: false },
        }),
      ])
    } else {
      if (targetUserId) {
        await prisma.user.delete({ where: { id: targetUserId } })
      } else if (targetVendorId) {
        await prisma.restaurant.delete({ where: { id: targetVendorId } })
      }
    }
    await invalidateRestaurantCache()
    await AdminStatsCache.invalidateDailyStats(new Date().toISOString().split('T')[0])

    // Broadcast vendor deletion event to Admin WebSocket channels
    broadcast('admin_stats', {
      type: mustPreserveHistory ? 'vendor_deactivated' : 'vendor_deleted',
      vendorId: targetVendorId,
      userId: targetUserId,
      timestamp: new Date().toISOString(),
    })
    broadcast('admin_users', {
      type: mustPreserveHistory ? 'user_deactivated' : 'user_deleted',
      userId: targetUserId,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      action: mustPreserveHistory ? 'deactivated' : 'deleted',
      message: mustPreserveHistory
        ? 'Vendor was deactivated; historical orders and financial records were preserved.'
        : 'Restaurant and vendor account were deleted.',
      deletedVendorId: targetVendorId,
    })
  } catch (error: any) {
    console.error('Error in delete-vendor route:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete vendor.' },
      { status: 500 }
    )
  }
}
