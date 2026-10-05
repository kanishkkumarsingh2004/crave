import { createCustomerAddress, deleteCustomerAddress, getCustomerAddresses } from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function resolveUserId(request: Request): Promise<string | null> {
  let token = ''

  const authHeader =
    typeof request.headers?.get === 'function' ? request.headers.get('authorization') : null
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('crave_auth_token') ?? cookieStore.get('drop_auth_token')
    if (cookie) token = cookie.value
  }

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.id ?? null
}

export async function GET(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const addresses = await getCustomerAddresses(userId)
    return NextResponse.json({ addresses })
  } catch (err) {
    console.error('[GET /api/user/addresses]', err)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { label, address, latitude, longitude, is_default } = body || {}

  if (!address || typeof address !== 'string' || !address.trim()) {
    return NextResponse.json({ error: 'Address text is required' }, { status: 400 })
  }

  try {
    const created = await createCustomerAddress({
      customer_id: userId,
      label: label ? String(label) : 'Home',
      address: address.trim(),
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      is_default: is_default !== undefined ? Boolean(is_default) : true,
    })

    broadcast('user_addresses', {
      type: 'create',
      userId,
      address: created,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, address: created })
  } catch (err) {
    console.error('[POST /api/user/addresses]', err)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  let id = url.searchParams.get('id')

  if (!id) {
    try {
      const body = await request.json()
      id = body?.id ?? null
    } catch {}
  }

  if (!id) {
    return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
  }

  try {
    const success = await deleteCustomerAddress(id, userId)
    if (!success) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 })
    }

    broadcast('user_addresses', {
      type: 'delete',
      userId,
      id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/user/addresses]', err)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
