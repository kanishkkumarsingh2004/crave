/**
 * Database Access Layer — Users
 * Single source of truth: Prisma/PostgreSQL with fallback seed catalog for offline/local resilience.
 */
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import type { User, UserRole } from '@prisma/client'

const SEED_PASSWORD_HASH = hashPassword('123456789')

export const FALLBACK_SEED_USERS: User[] = [
  {
    id: 'usr_admin_01',
    name: 'System Administrator',
    email: 'admin@crave.com',
    role: 'admin',
    password_hash: SEED_PASSWORD_HASH,
    phone: '+919876543210',
    address: 'HQ, Bengaluru',
    avatar: null,
    restaurant_name: null,
    cuisine: null,
    vehicle_type: null,
    license_plate: null,
    locale: 'en',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'usr_customer_01',
    name: 'Priya Sharma (Customer)',
    email: 'user@crave.com',
    role: 'user',
    password_hash: SEED_PASSWORD_HASH,
    phone: '+919876543211',
    address: '124, 4th Cross, Koramangala 4th Block, Bengaluru, Karnataka 560034',
    avatar: null,
    restaurant_name: null,
    cuisine: null,
    vehicle_type: null,
    license_plate: null,
    locale: 'en',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'usr_vendor_01',
    name: 'Chef Marco (Vendor)',
    email: 'vendor@crave.com',
    role: 'restaurant_vendor',
    password_hash: SEED_PASSWORD_HASH,
    phone: '+919876543212',
    restaurant_name: 'Spice Garden Gourmet',
    cuisine: 'North Indian & Mughlai',
    address: 'Indiranagar, Bengaluru',
    avatar: null,
    vehicle_type: null,
    license_plate: null,
    locale: 'en',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'usr_darkstore_01',
    name: 'Dark Store Operator',
    email: 'darkstore@crave.com',
    role: 'cravexp_store_vendor',
    password_hash: SEED_PASSWORD_HASH,
    phone: '+919876543213',
    restaurant_name: 'craveXP 10 Store Hub',
    cuisine: 'Instant Groceries & Daily Needs',
    address: 'Koramangala, Bengaluru',
    avatar: null,
    vehicle_type: null,
    license_plate: null,
    locale: 'en',
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'usr_rider_01',
    name: 'Rider Rahul (Fleet Driver)',
    email: 'rider@crave.com',
    role: 'rider',
    password_hash: SEED_PASSWORD_HASH,
    phone: '+919876543214',
    vehicle_type: 'Electric Scooter',
    license_plate: 'KA-01-EQ-9988',
    address: 'Bengaluru',
    avatar: null,
    restaurant_name: null,
    cuisine: null,
    locale: 'en',
    created_at: new Date('2026-01-01'),
  },
]

// ─── Queries ─────────────────────────────────────────────

export async function findUserById(id: string): Promise<User | null> {
  if (prisma) {
    try {
      return await prisma.user.findUnique({ where: { id } })
    } catch (err) {
      console.warn('[findUserById] Database query failed, checking seed users:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_USERS.find((u) => u.id === id) || null
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase()
  if (prisma) {
    try {
      return await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      })
    } catch (err) {
      console.warn('[findUserByEmail] Database query failed, checking seed users:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_USERS.find((u) => u.email.toLowerCase() === cleanEmail) || null
}

export async function listUsersByRole(role: UserRole): Promise<User[]> {
  if (prisma) {
    try {
      return await prisma.user.findMany({
        where: { role },
        orderBy: { created_at: 'desc' },
      })
    } catch (err) {
      console.warn('[listUsersByRole] Database query failed, checking seed users:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_USERS.filter((u) => u.role === role)
}

export async function listAllUsers(): Promise<User[]> {
  if (prisma) {
    try {
      return await prisma.user.findMany({ orderBy: { created_at: 'desc' } })
    } catch (err) {
      console.warn('[listAllUsers] Database query failed, returning seed users:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_USERS
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
  if (!prisma) {
    const synthetic: User = {
      ...data,
      phone: data.phone || null,
      address: data.address || null,
      avatar: data.avatar || null,
      restaurant_name: data.restaurant_name || null,
      cuisine: data.cuisine || null,
      vehicle_type: data.vehicle_type || null,
      license_plate: data.license_plate || null,
      password_hash: data.password_hash || null,
      locale: 'en',
      created_at: new Date(),
    }
    FALLBACK_SEED_USERS.push(synthetic)
    return synthetic
  }
  try {
    return await prisma.user.create({ data })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to create user in PostgreSQL: ${detail}`)
  }
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>): Promise<User> {
  if (!prisma) {
    const idx = FALLBACK_SEED_USERS.findIndex((u) => u.id === id)
    if (idx !== -1) {
      FALLBACK_SEED_USERS[idx] = { ...FALLBACK_SEED_USERS[idx], ...data }
      return FALLBACK_SEED_USERS[idx]
    }
    throw new Error(`User ${id} not found in fallback catalog`)
  }
  try {
    return await prisma.user.update({ where: { id }, data: data as any })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to update user ${id}: ${detail}`)
  }
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  if (!prisma) {
    const idx = FALLBACK_SEED_USERS.findIndex((u) => u.id === id)
    if (idx !== -1) FALLBACK_SEED_USERS.splice(idx, 1)
    return { id }
  }
  try {
    await prisma.user.delete({ where: { id } })
    return { id }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown database error'
    throw new Error(`Unable to delete user ${id}: ${detail}`)
  }
}
