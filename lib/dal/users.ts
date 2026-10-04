/**
 * Database Access Layer — Users
 * Resilient dual-engine: Prisma ORM with Supabase REST and local file store fallback
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import {
  findUserByEmail as findUserInLocalStore,
  getRegisteredUsers,
  saveRegisteredUser,
  RegisteredUser,
} from '@/lib/user-store'
import type { User, UserRole } from '@prisma/client'

// ─── Queries ─────────────────────────────────────────────

export async function findUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (user) return user
  } catch (e) {}

  try {
    const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    if (data) return data
  } catch (e) {}

  const local = getRegisteredUsers().find((u) => u.id === id)
  return local || null
}

export async function findUserByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase()

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    })
    if (user) return user
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (data) return data
  } catch (e) {}

  const local = findUserInLocalStore(cleanEmail)
  return local || null
}

export async function listUsersByRole(role: UserRole) {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      orderBy: { created_at: 'desc' },
    })
    if (users && users.length > 0) return users
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) return data
  } catch (e) {}

  return getRegisteredUsers().filter((u) => u.role === role)
}

export async function listAllUsers() {
  try {
    const users = await prisma.user.findMany({ orderBy: { created_at: 'desc' } })
    if (users && users.length > 0) return users
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) return data
  } catch (e) {}

  return getRegisteredUsers()
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
  // Always save to local store as baseline
  try {
    const localUser: RegisteredUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as any,
      phone: data.phone || undefined,
      address: data.address || undefined,
      createdAt: new Date().toISOString(),
    }
    saveRegisteredUser(localUser)
  } catch (e) {}

  try {
    return await prisma.user.create({ data })
  } catch (e) {}

  try {
    const { data: created } = await supabase
      .from('users')
      .insert([data as any])
      .select()
      .single()
    if (created) return created
  } catch (e) {}

  return { ...data, created_at: new Date() }
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id'>>) {
  try {
    return await prisma.user.update({ where: { id }, data: data as any })
  } catch (e) {}

  try {
    const { data: updated } = await supabase
      .from('users')
      .update(data as any)
      .eq('id', id)
      .select()
      .single()
    if (updated) return updated
  } catch (e) {}

  return { id, ...data }
}

export async function deleteUser(id: string) {
  try {
    return await prisma.user.delete({ where: { id } })
  } catch (e) {}

  try {
    await supabase.from('users').delete().eq('id', id)
  } catch (e) {}

  return { id }
}

export async function deleteUserByEmail(email: string) {
  const user = await findUserByEmail(email)
  if (!user) return null
  return deleteUser(user.id)
}
