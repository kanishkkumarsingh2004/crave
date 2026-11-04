/**
 * Database Access Layer — Users
 * Single source of truth: Prisma/PostgreSQL.
 *
 * P1.3 FIX: Query functions no longer swallow database errors by returning
 * null or [].  Each function now re-throws so callers can distinguish a
 * genuine empty result from a database failure and respond appropriately
 * (e.g., return 500 instead of an empty list that looks like success).
 *
 * Exception: createUser, updateUser, deleteUser already threw; they are
 * unchanged in that respect.
 */
import { prisma } from '@/lib/infra/prisma'
import type { Prisma, User, UserRole } from '@prisma/client'

export const PUBLIC_USER_SELECT = {
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
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>

// ─── Queries ─────────────────────────────────────────────

export async function findUserById(id: string): Promise<User | null> {
  // P1.3 FIX: Do not catch here. A thrown error means the database is
  // unavailable; returning null here would make a DB outage look like
  // "user not found" and suppress the error from callers.
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase()
  // P1.3 FIX: Let database errors propagate to the caller.
  return prisma.user.findFirst({
    where: { email: { equals: cleanEmail, mode: 'insensitive' } },
  })
}

export async function listUsersByRole(role: UserRole): Promise<User[]> {
  // P1.3 FIX: Removed try/catch that returned [] on any DB error.
  // An empty array is a valid business result; a thrown error is not.
  return prisma.user.findMany({
    where: { role },
    orderBy: { created_at: 'desc' },
  })
}

export async function listAllUsers(): Promise<User[]> {
  // P1.3 FIX: Removed swallowing catch.
  return prisma.user.findMany({ orderBy: { created_at: 'desc' } })
}

// ─── Mutations ───────────────────────────────────────────

export async function createUser(data: {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string | null
  address?: string | null
  avatar?: string | null
  restaurant_name?: string | null
  cuisine?: string | null
  vehicle_type?: string | null
  license_plate?: string | null
  password_hash?: string | null
}): Promise<User> {
  try {
    return await prisma.user.create({ data })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to create user in PostgreSQL: ${detail}`)
  }
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>): Promise<PublicUser> {
  try {
    return await prisma.user.update({
      where: { id },
      data: data as any,
      select: PUBLIC_USER_SELECT,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to update user ${id}: ${detail}`)
  }
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  try {
    await prisma.user.delete({ where: { id } })
    return { id }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to delete user ${id}: ${detail}`)
  }
}
