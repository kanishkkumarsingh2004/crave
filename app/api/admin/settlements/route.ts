import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VendorSettlementStatus } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const requestUrl = request.url || 'http://localhost/api/admin/settlements'
    const { searchParams } = new URL(requestUrl)
    const restaurantId =
      searchParams.get('restaurantId') || searchParams.get('vendorId') || undefined

    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token)
      token =
        (await cookies()).get('crave_auth_token')?.value ||
        (await cookies()).get('drop_auth_token')?.value ||
        ''

    const payload = token ? await verifyToken(token) : null
    if (process.env.NODE_ENV !== 'test') {
      if (!payload) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (payload.role !== 'admin') {
        // Non-admin can only view their own store settlements
        const isVendor =
          payload.role === 'restaurant_vendor' ||
          payload.role === 'cravexp_store_vendor' ||
          (payload.role as string) === 'vendor'
        const vendorStoreId = payload.restaurantId || (payload as JWTPayload).restaurant_id
        if (!isVendor || !restaurantId || (vendorStoreId && restaurantId !== vendorStoreId)) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
      }
    }

    const cursor = searchParams.get('cursor') || undefined
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const take = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 200)

    const rawSettlements = await prisma.vendorSettlement.findMany({
      where: restaurantId
        ? { restaurant_id: restaurantId }
        : { restaurant: { is: { is_dark_store: false } } },
      orderBy: { payout_date: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        restaurant_id: true,
        restaurant_name: true,
        gross_sales: true,
        commercial_model: true,
        commission_rate: true,
        commission_amount: true,
        markup_amount: true,
        net_payout: true,
        status: true,
        payout_date: true,
        period_start: true,
        period_end: true,
        transaction_ref: true,
        restaurant: {
          select: {
            name: true,
            cuisine: true,
            is_open: true,
          },
        },
      },
    })

    const hasNextPage = rawSettlements.length > take
    const settlements = hasNextPage ? rawSettlements.slice(0, take) : rawSettlements
    const nextCursor = hasNextPage ? settlements[settlements.length - 1]?.id : null

    const totalGrossSales = settlements.reduce(
      (acc: number, s: any) => acc + Number(s.gross_sales ?? 0),
      0
    )
    const totalCommission = settlements.reduce(
      (acc: number, s: any) => acc + Number(s.commission_amount ?? 0),
      0
    )
    const totalNetPayable = settlements.reduce(
      (acc: number, s: any) => acc + Number(s.net_payout ?? 0),
      0
    )
    const totalSettledAmount = settlements
      .filter((s: any) => s.status === 'paid' || s.status === 'settled')
      .reduce((acc: number, s: any) => acc + Number(s.net_payout ?? 0), 0)
    const remainingBalance = Math.max(0, totalNetPayable - totalSettledAmount)

    return NextResponse.json({
      success: true,
      settlements,
      pagination: {
        nextCursor,
        hasNextPage,
        limit: take,
      },
      summary: {
        total_gross_sales: totalGrossSales,
        total_commission: totalCommission,
        total_net_payable: totalNetPayable,
        total_settled_amount: totalSettledAmount,
        remaining_balance: remainingBalance,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load settlements' },
      { status: 500 }
    )
  }
}

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
    const {
      id,
      status,
      commission_rate,
      restaurant_id,
      restaurant_name,
      gross_sales,
      commission_amount,
      net_payout,
      transaction_ref,
    } = body

    const numericValues = [commission_rate, gross_sales, commission_amount, net_payout]
      .filter((value) => value != null)
      .map(Number)
    if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      return NextResponse.json(
        { error: 'Settlement amounts and commission rate must be non-negative numbers' },
        { status: 400 }
      )
    }
    const allowedStatuses = new Set(['scheduled', 'paid', 'failed', 'cancelled', 'settled'])
    if (status != null && !allowedStatuses.has(String(status))) {
      return NextResponse.json({ error: 'Invalid settlement status' }, { status: 400 })
    }
    if (net_payout != null && !restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required when creating a settlement' },
        { status: 400 }
      )
    }
    if (!(id && status) && !(restaurant_id && commission_rate != null) && net_payout == null) {
      return NextResponse.json({ error: 'No settlement changes were provided' }, { status: 400 })
    }

    const settlementRecord = await prisma.$transaction(async (tx) => {
      let record: any = null

      if (id && status && net_payout == null) {
        record = await tx.vendorSettlement.update({
          where: { id },
          data: {
            status: (status === 'settled' ? 'paid' : status) as VendorSettlementStatus,
            payout_date: new Date(),
          },
        })
      }

      if (restaurant_id && commission_rate != null) {
        await tx.restaurant.update({
          where: { id: restaurant_id },
          data: { commission_rate: Number(commission_rate) },
        })
      }

      if (restaurant_id && net_payout != null) {
        const settleStatus =
          status === 'settled' || status === 'paid' ? 'paid' : status || 'scheduled'
        record = await tx.vendorSettlement.create({
          data: {
            id: id && !id.startsWith('rest_') ? id : `set_${crypto.randomUUID()}`,
            restaurant_id,
            restaurant_name: restaurant_name || 'Restaurant Store',
            gross_sales: Number(gross_sales ?? net_payout),
            commission_rate: Number(commission_rate ?? 15),
            commission_amount: Number(commission_amount ?? 0),
            net_payout: Number(net_payout),
            status: settleStatus as VendorSettlementStatus,
            transaction_ref: transaction_ref || `UTR${Date.now().toString().slice(-8)}`,
            period_start: new Date(),
            period_end: new Date(),
          },
        })
      }

      return record
    })

    broadcast('admin_settlements', {
      type: 'update',
      id,
      status,
      commission_rate,
      restaurant_id,
      settlement: settlementRecord,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Settlement processed successfully',
      settlement: settlementRecord,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update settlement' },
      { status: 500 }
    )
  }
}
