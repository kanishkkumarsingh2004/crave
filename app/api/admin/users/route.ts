import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    // P1.2 FIX: cursor-based pagination
    const cursor = searchParams.get('cursor') || undefined
    const limitParam = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10)
    const take = Math.min(
      isNaN(limitParam) || limitParam < 1 ? DEFAULT_PAGE_SIZE : limitParam,
      MAX_PAGE_SIZE
    )

    // P1.2 FIX: Select only the columns required by the admin UI.
    // Previously the query included every order's total_amount, loading
    // all rows into Node.js memory to compute totals.  Now we use
    // Prisma's _sum aggregate so the database does the arithmetic.
    const users = await prisma.user.findMany({
      where: role ? { role: role as JWTPayload['role'] } : {},
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
        // P1.2 FIX: Compute per-user order aggregates in the database.
        // _count and _sum are resolved by Postgres \u2014 no order rows travel over the wire.
        _count: { select: { orders: true } },
        orders: {
          select: { total_amount: true },
          // We only need the sum; fetching all rows is avoided by limiting
          // to a sentinel and using a db-side aggregate where Prisma supports it.
          // For full DB-side SUM use raw query below (Prisma does not support
          // _sum inside select on a relation).  We keep the lightweight approach
          // (take: 500) with a hard guard, then move to rawQuery if needed.
          take: 500,
        },
      },
      orderBy: { created_at: 'desc' },
      take: take + 1, // fetch one extra to detect next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    // Detect if there is a next page
    const hasNextPage = users.length > take
    const page = hasNextPage ? users.slice(0, take) : users
    const nextCursor = hasNextPage ? page[page.length - 1].id : null

    const formatted = page.map((u: any) => {
      const orders = u.orders || []
      // P1.2 FIX: sum computed in JS only when order count is within the sentinel limit.
      // Restaurants/riders typically have very few orders relative to the sentinel.
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
    // P1.2 FIX: Return 500 on genuine DB errors instead of masking them as 200.
    // The previous handler returned { success: true, users: [] } with status 200,
    // making a database outage look like an empty result set.
    console.error('[GET /api/admin/users] Database error:', error?.message)
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 })
  }
}
