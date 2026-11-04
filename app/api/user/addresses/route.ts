import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  updateCustomerAddress,
} from '@/lib/dal'
import { getAuthActor } from '@/lib/auth-helpers'
import { broadcast } from '@/lib/ws-server'
import { toAddressRealtimeDto } from '@/lib/realtime/safe-dtos'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
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
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
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
      address: toAddressRealtimeDto(created),
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, address: created })
  } catch (err) {
    console.error('[POST /api/user/addresses]', err)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { id, label, address, latitude, longitude, is_default, action } = body || {}

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
  }

  try {
    if (action === 'set_default' || (is_default === true && !address && !label)) {
      const ok = await setDefaultAddress(id, userId)
      if (!ok) {
        return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 })
      }

      broadcast('user_addresses', {
        type: 'set_default',
        userId,
        id,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({ success: true, is_default: true })
    }

    const updated = await updateCustomerAddress({
      id,
      customer_id: userId,
      label: label ? String(label) : undefined,
      address: address && typeof address === 'string' ? address.trim() : undefined,
      latitude: latitude != null ? Number(latitude) : undefined,
      longitude: longitude != null ? Number(longitude) : undefined,
      is_default: is_default !== undefined ? Boolean(is_default) : undefined,
    })

    if (!updated) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 })
    }

    broadcast('user_addresses', {
      type: 'update',
      userId,
      address: toAddressRealtimeDto(updated),
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, address: updated })
  } catch (err) {
    console.error('[PUT /api/user/addresses]', err)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  return PUT(request)
}

export async function DELETE(request: Request) {
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
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
