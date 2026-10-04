import fs from 'fs'
import path from 'path'
import { JWTPayload } from './jwt'

export interface RegisteredUser {
  id: string
  name: string
  email: string
  password?: string
  role:
    | 'user'
    | 'restaurant_vendor'
    | 'cravexp_store_vendor'
    | 'rider'
    | 'admin'
    | 'customer'
    | 'vendor'
    | 'driver'
  phone?: string
  address?: string
  createdAt: string
}

const DATA_FILE = path.join(process.cwd(), 'data', 'registered_users.json')

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

export function getRegisteredUsers(): RegisteredUser[] {
  try {
    ensureDataFile()
    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(content) || []
  } catch (err) {
    return []
  }
}

export function saveRegisteredUser(user: RegisteredUser): void {
  try {
    ensureDataFile()
    const users = getRegisteredUsers()
    const cleanEmail = user.email.trim().toLowerCase()
    const index = users.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail)
    if (index >= 0) {
      users[index] = { ...users[index], ...user }
    } else {
      users.push(user)
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save registered user:', err)
  }
}

export function findUserByEmail(email: string): RegisteredUser | null {
  const cleanEmail = email.trim().toLowerCase()
  const users = getRegisteredUsers()
  return users.find((u) => u.email.trim().toLowerCase() === cleanEmail) || null
}
