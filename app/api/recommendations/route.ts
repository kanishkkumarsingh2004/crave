import { getCartCrossSellItems, getUserReorderHistory } from '@/lib/dal/recommendations'
import { handleAuthError, requireRole } from '@/lib/auth-helpers'
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
      const actor = await requireRole(request, ['user', 'customer', 'admin'])
      const requestedCustomerId = searchParams.get('customerId')

      if (actor.role !== 'admin' && requestedCustomerId && requestedCustomerId !== actor.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const customerId =
        actor.role === 'admin' && requestedCustomerId ? requestedCustomerId : actor.id

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
    return handleAuthError(error)
  }
}
