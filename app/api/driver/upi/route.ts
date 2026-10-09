import { NextResponse } from 'next/server'
import { createDriverUpiAccount, listDriverUpiAccounts } from '@/lib/dal/payments'
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { getApiActor, requireAuthApi } from '@/lib/api-auth'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor.id || 'driver_partner'

    const accounts = await listDriverUpiAccounts(driverId)
    const formatted = (accounts || []).map((acc: any) => ({
      id: acc.id,
      vpa: acc.vpa,
      bankName: acc.bank_name || 'Google Pay / PhonePe UPI',
      isPrimary: Boolean(acc.is_primary),
      isVerified: Boolean(acc.is_verified ?? true),
    }))

    return NextResponse.json({ success: true, savedUpiList: formatted })
  } catch (error: any) {
    console.error('[GET /api/driver/upi]', error)
    return NextResponse.json({ success: false, savedUpiList: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const body = await request.json()
    const { vpa, bankName, driverId: bodyDriverId, isPrimary } = body
    const driverId = bodyDriverId || actor.id || 'driver_partner'

    if (!vpa || !vpa.includes('@')) {
      return NextResponse.json({ error: 'Valid UPI VPA required' }, { status: 400 })
    }

    const id = `upi_${crypto.randomUUID().slice(0, 8)}`
    const created = await createDriverUpiAccount({
      id,
      driver_id: driverId,
      vpa: String(vpa).trim(),
      bank_name: bankName || 'Google Pay / PhonePe UPI',
      is_primary: Boolean(isPrimary),
    })

    return NextResponse.json({
      success: true,
      account: {
        id: created.id,
        vpa: created.vpa,
        bankName: created.bank_name || bankName || 'Google Pay / PhonePe UPI',
        isPrimary: Boolean(created.is_primary),
        isVerified: Boolean(created.is_verified ?? true),
      },
    })
  } catch (error: any) {
    console.error('[POST /api/driver/upi]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save UPI account' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'UPI ID is required' }, { status: 400 })
    }

    // Verify ownership before deleting
    if (actor.role !== 'admin') {
      const existingAccount = await prisma.driverUpiAccount.findUnique({
        where: { id },
        select: { driver_id: true },
      })
      if (existingAccount && existingAccount.driver_id !== actor.id) {
        return NextResponse.json({ error: 'Unauthorized to delete this account' }, { status: 403 })
      }
    }

    try {
      await prisma.driverUpiAccount.delete({ where: { id } })
    } catch {
      try {
        await supabase.from('driver_upi_accounts').delete().eq('id', id)
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'UPI handle deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete UPI handle' },
      { status: 500 }
    )
  }
}
