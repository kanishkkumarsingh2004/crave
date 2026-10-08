/**
 * Database Access Layer — Users
 * Single source of truth: Prisma/PostgreSQL.
 * Supabase is fully disabled — all legacy fallback branches removed.
 */
import { prisma } from '@/lib/prisma'
import type { User, UserRole } from '@prisma/client'

// ─── Queries ─────────────────────────────────────────────

export async function findUserById(id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({ where: { id } })
  } catch {
    return null
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase()
  try {
    return await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    })
  } catch {
    return null
  }
}

export async function listUsersByRole(role: UserRole): Promise<User[]> {
  try {
    return await prisma.user.findMany({
      where: { role },
      orderBy: { created_at: 'desc' },
    })
  } catch {
    return []
  }
}

export async function listAllUsers(): Promise<User[]> {
  try {
    return await prisma.user.findMany({ orderBy: { created_at: 'desc' } })
  } catch {
    return []
  }
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

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
  try {
    return await prisma.user.update({ where: { id }, data: data as any })
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

export async function deleteUserByEmail(email: string): Promise<{ id: string } | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  return deleteUser(user.id)
}
