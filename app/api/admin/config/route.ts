import { NextResponse } from 'next/server'
import { requireAuthApi, handleApiAuthError } from '@/lib/api-auth'
import { redis } from '@/lib/redis'

// XP-09 FIX: Admin configuration was previously stored only in the browser localStorage.
// This meant Maintenance Mode, Auto-assign drivers, rate limits, and session timeouts
// only affected the admin's own browser tab and were invisible to the server.
// This endpoint persists config to Redis (or an in-process map as fallback) so settings
// survive page reloads, apply across admin sessions, and can be read server-side.

const REDIS_KEY = 'crave:admin:config'

// In-memory fallback for environments where Redis is not available.
// Strictly better than localStorage: visible to all routes on the same process.
const inMemoryConfig: Record<string, unknown> = {}

async function readConfig(): Promise<Record<string, unknown>> {
  if (redis) {
    try {
      const raw = await redis.get(REDIS_KEY)
      if (raw) return JSON.parse(raw) as Record<string, unknown>
    } catch {
      // Fall through to in-memory store
    }
  }
  return { ...inMemoryConfig }
}

async function writeConfig(data: Record<string, unknown>): Promise<void> {
  Object.assign(inMemoryConfig, data)
  if (redis) {
    try {
      await redis.set(REDIS_KEY, JSON.stringify(data))
    } catch {
      // Redis write failed; in-memory store is the fallback
    }
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const config = await readConfig()
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    if (actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid config payload' }, { status: 400 })
    }
    await writeConfig(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
