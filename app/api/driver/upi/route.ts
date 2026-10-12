import { NextResponse } from 'next/server'
import { createDriverUpiAccount, listDriverUpiAccounts } from '@/lib/dal/payments'
import { prisma } from '@/lib/prisma'
import { requireAuthApi, handleApiAuthError } from '@/lib/api-auth'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driverId') || actor.id

    if (actor.role !== 'admin' && actor.id !== driverId) {
      return NextResponse.json({ error: 'Unauthorized to view this driver account' }, { status: 403 })
    }

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
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[GET /api/driver/upi]', error)
    return NextResponse.json({ success: false, savedUpiList: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const body = await request.json()
    const { vpa, bankName, driverId: bodyDriverId, isPrimary } = body
    const driverId = bodyDriverId || actor.id

    if (actor.role !== 'admin' && actor.id !== driverId) {
      return NextResponse.json({ error: 'Unauthorized to add UPI account for this driver' }, { status: 403 })
    }

    if (!vpa || !vpa.includes('@')) {
      return NextResponse.json({ error: 'Valid UPI VPA required' }, { status: 400 })
    }

    if (isPrimary) {
      await prisma.driverUpiAccount.updateMany({
        where: { driver_id: driverId },
        data: { is_primary: false },
      })
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
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[POST /api/driver/upi]', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save UPI account' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const body = await request.json()
    const { id, isPrimary } = body

    if (!id) {
      return NextResponse.json({ error: 'UPI Account ID is required' }, { status: 400 })
    }

    const existingAccount = await prisma.driverUpiAccount.findUnique({
      where: { id },
    })

    if (!existingAccount) {
      return NextResponse.json({ error: 'UPI account not found' }, { status: 404 })
    }

    if (actor.role !== 'admin' && existingAccount.driver_id !== actor.id) {
      return NextResponse.json({ error: 'Unauthorized to modify this account' }, { status: 403 })
    }

    if (isPrimary) {
      await prisma.driverUpiAccount.updateMany({
        where: { driver_id: existingAccount.driver_id },
        data: { is_primary: false },
      })
    }

    const updated = await prisma.driverUpiAccount.update({
      where: { id },
      data: { is_primary: Boolean(isPrimary) },
    })

    return NextResponse.json({ success: true, account: updated })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    return NextResponse.json(
      { error: error?.message || 'Failed to update UPI account' },
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

    await prisma.driverUpiAccount.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'UPI handle deleted successfully' })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    return NextResponse.json(
      { error: error?.message || 'Failed to delete UPI handle' },
      { status: 500 }
    )
  }
}
