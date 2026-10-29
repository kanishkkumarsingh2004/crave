import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { listAllUsers, listUsersByRole } from '@/lib/dal'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      const cookieStore = await cookies()
      token =
        cookieStore.get('crave_auth_token')?.value ||
        cookieStore.get('drop_auth_token')?.value ||
        cookieStore.get('crave_token')?.value ||
        ''
    }

    const payload = token ? await verifyToken(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const cursor = searchParams.get('cursor') || undefined
    const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)
    const take = Math.min(
      isNaN(limitParam) || limitParam < 1 ? DEFAULT_PAGE_SIZE : limitParam,
      MAX_PAGE_SIZE
    )

    const normalizedRole = role === 'driver' ? 'rider' : role === 'customer' ? 'user' : role
    let users: any[] = []

    if (prisma) {
      try {
        users = await prisma.user.findMany({
          where: normalizedRole ? { role: normalizedRole as any } : {},
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            avatar: true,
            restaurant_name: true,
            cuisine: true,
            vehicle_type: true,
            license_plate: true,
            locale: true,
            created_at: true,
            _count: { select: { orders: true } },
            orders: {
              select: { total_amount: true },
              take: 500,
            },
          },
          orderBy: { created_at: 'desc' },
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        })
      } catch (e) {
        console.warn('[GET /api/admin/users] Prisma query failed, using DAL fallback:', e)
      }
    }

    if (!users || users.length === 0) {
      const fallbackList = normalizedRole
        ? await listUsersByRole(normalizedRole as any)
        : await listAllUsers()
      users = fallbackList.slice(0, take + 1)
    }

    // Detect if there is a next page
    const hasNextPage = users.length > take
    const page = hasNextPage ? users.slice(0, take) : users
    const nextCursor = hasNextPage ? page[page.length - 1].id : null

    const formatted = page.map((u: any) => {
      const orders = u.orders || []
      const totalSpent = orders.reduce(
        (sum: number, o: any) => sum + Number(o.total_amount || 0),
        0
      )
      const { orders: _orders, _count, ...userFields } = u
      return {
        ...userFields,
        total_spent: totalSpent,
        total_orders: _count?.orders ?? orders.length,
        payment_model: 'commission',
      }
    })

    return NextResponse.json({
      success: true,
      users: formatted,
      pagination: {
        take,
        nextCursor,
        hasNextPage,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/users] Database error:', error?.message)
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 })
  }
}
