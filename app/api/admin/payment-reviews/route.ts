import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined
    const reviews = await prisma.paymentReview.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json({ success: true, reviews })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load reviews' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Review ID and status are required' }, { status: 400 })
    }

    const updated = await prisma.paymentReview.update({
      where: { id },
      data: { status },
    })

    if (updated) {
      broadcast('approval_update', { status, orderId: updated.order_id })
    }

    return NextResponse.json({ success: true, count: 1 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}
