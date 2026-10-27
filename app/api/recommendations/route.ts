import { getCartCrossSellItems, getUserReorderHistory } from '@/lib/dal/recommendations'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'cart_upsell'

    // ─── 1. Cart Cross-Sell Recommendations ───────────────────
    if (type === 'cart_upsell') {
      const restaurantId = searchParams.get('restaurantId')
      if (!restaurantId) {
        return NextResponse.json(
          { success: false, error: 'restaurantId is required for cart_upsell recommendations' },
          { status: 400 }
        )
      }

      const rawItemIds = searchParams.get('itemIds') || ''
      const cartItemIds = rawItemIds
        ? rawItemIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

      const isVegOnly = searchParams.get('isVeg') === 'true'
      const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit')) || 4))

      const recommendations = await getCartCrossSellItems({
        restaurantId,
        cartItemIds,
        isVegOnly,
        limit,
      })

      return NextResponse.json({
        success: true,
        type: 'cart_upsell',
        count: recommendations.length,
        recommendations,
      })
    }

    // ─── 2. Personalized Re-Order History ─────────────────────
    if (type === 'reorder') {
      let customerId = searchParams.get('customerId')

      if (!customerId) {
        // Fallback to active auth cookie
        try {
          const cookieStore = await cookies()
          const token = cookieStore.get('token')?.value
          if (token) {
            const decoded = await verifyToken(token)
            if (decoded && decoded.id) {
              customerId = decoded.id
            }
          }
        } catch {
          // Unauthenticated caller
        }
      }

      if (!customerId) {
        return NextResponse.json({
          success: true,
          type: 'reorder',
          count: 0,
          packages: [],
        })
      }

      const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit')) || 4))
      const packages = await getUserReorderHistory(customerId, limit)

      return NextResponse.json({
        success: true,
        type: 'reorder',
        count: packages.length,
        packages,
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported recommendation type: ${type}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in /api/recommendations:', error)
    return NextResponse.json(
      { success: false, error: 'Internal recommendation engine error' },
      { status: 500 }
    )
  }
}
