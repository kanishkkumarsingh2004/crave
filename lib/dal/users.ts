/**
 * Database Access Layer — Users
 * Requires Prisma or Supabase to be available; no silent file-store fallback.
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import type { User, UserRole } from '@prisma/client'

// ─── Queries ─────────────────────────────────────────────

export async function findUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (user) return user
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    if (data) return data
  } catch (e) {
    // Supabase unavailable; no file-store fallback allowed.
  }

  throw new Error(`User not found for id: ${id}`)
}

export async function findUserByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase()

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    })
    if (user) return user
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (data) return data
  } catch (e) {
    // Supabase unavailable; no file-store fallback allowed.
  }

  throw new Error(`User not found for email: ${cleanEmail}`)
}

export async function listUsersByRole(role: UserRole) {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      orderBy: { created_at: 'desc' },
    })
    if (users && users.length > 0) return users
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) return data
  } catch (e) {
    // Supabase unavailable; no file-store fallback allowed.
  }

  throw new Error(`No users found for role: ${role}`)
}

export async function listAllUsers() {
  try {
    const users = await prisma.user.findMany({ orderBy: { created_at: 'desc' } })
    if (users && users.length > 0) return users
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) return data
  } catch (e) {
    // Supabase unavailable; no file-store fallback allowed.
  }

  throw new Error('No users available from configured backend')
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
}) {
  try {
    return await prisma.user.create({ data })
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data: created } = await supabase
      .from('users')
      .insert([data as any])
      .select()
      .single()
    if (created) return created
  } catch (e) {
    // Supabase unavailable; fail loudly instead of silently writing to local files.
  }

  throw new Error(`Unable to create user: ${data.email}`)
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>) {
  try {
    return await prisma.user.update({ where: { id }, data: data as any })
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data: updated } = await supabase
      .from('users')
      .update(data as any)
      .eq('id', id)
      .select()
      .single()
    if (updated) return updated
  } catch (e) {
    // Supabase unavailable; fail loudly instead of mutating local files.
  }

  throw new Error(`Unable to update user: ${id}`)
}

export async function deleteUser(id: string) {
  try {
    return await prisma.user.delete({ where: { id } })
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    await supabase.from('users').delete().eq('id', id)
    return { id }
  } catch (e) {
    // Supabase unavailable; fail loudly instead of silently reporting success.
  }

  throw new Error(`Unable to delete user: ${id}`)
}

export async function deleteUserByEmail(email: string) {
  const user = await findUserByEmail(email)
  if (!user) return null
  return deleteUser(user.id)
}
