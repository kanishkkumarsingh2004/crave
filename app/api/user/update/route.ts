import { randomUUID } from 'crypto'
import { updateUser } from '@/lib/dal'
import { PUBLIC_USER_SELECT } from '@/lib/dal/users'
import { resolveCoordinates } from '@/lib/dal/addresses'
import { prisma } from '@/lib/prisma'
import { getAuthActor } from '@/lib/auth-helpers'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export async function PATCH(request: Request) {
  const actor = await getAuthActor(request)
  const userId = actor?.id ?? null
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if ('name' in b) updates.name = String(b.name)
    if ('phone' in b) updates.phone = b.phone ? String(b.phone) : null
    if ('address' in b) updates.address = b.address ? String(b.address) : null
    // Password changes are intentionally NOT allowed here. They must go through
    // PATCH /api/user/change-password, which verifies the current password and
    // revokes all existing sessions after a successful rotation.
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  try {
    let updated
    if (updates.address && typeof updates.address === 'string' && updates.address.trim()) {
      const address = updates.address.trim()
      const coordinates = await resolveCoordinates(address)
      updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: updates,
          select: PUBLIC_USER_SELECT,
        })
        const currentDefault = await tx.customerAddress.findFirst({
          where: { customer_id: userId, is_default: true },
          select: { id: true },
        })
        if (currentDefault) {
          await tx.customerAddress.update({
            where: { id: currentDefault.id },
            data: {
              address,
              latitude: new Prisma.Decimal(coordinates.lat),
              longitude: new Prisma.Decimal(coordinates.lng),
            },
          })
        } else {
          await tx.customerAddress.updateMany({
            where: { customer_id: userId },
            data: { is_default: false },
          })
          await tx.customerAddress.create({
            data: {
              id: randomUUID(),
              customer_id: userId,
              label: 'Home',
              address,
              is_default: true,
              latitude: new Prisma.Decimal(coordinates.lat),
              longitude: new Prisma.Decimal(coordinates.lng),
            },
          })
        }
        return user
      })
    } else {
      updated = await updateUser(userId, updates)
    }

    broadcast('user_profile', {
      type: 'update',
      userId,
      user: updated,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    console.error('[PATCH /api/user/update]', err)
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
  }
}
