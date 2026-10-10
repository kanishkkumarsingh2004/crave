import { redis, isRedisAvailable } from '@/lib/redis'

export interface OfferLock {
  driverId: string
  requestId: string
  lockedAt: number
  expiresAt: number
}

// In-Memory Lock Registry (Local Fallback & Synchronous Cache)
const offerLocks = new Map<string, OfferLock>()
const DEFAULT_OFFER_TTL_MS = 15 * 1000 // 15 seconds offer timeout window

/**
 * PRIMARY API: Acquire a distributed atomic offer lock for a candidate driver.
 * Uses Redis SET NX PX for cross-pod atomicity. In production, fails closed if Redis unavailable.
 * Returns true if lock was successfully acquired, false if driver is already locked.
 */
export async function acquireDriverOfferLock(
  driverId: string,
  requestId: string,
  ttlMs: number = DEFAULT_OFFER_TTL_MS
): Promise<boolean> {
  const now = Date.now()

  // Try Redis first for distributed atomicity
  if (isRedisAvailable() && redis) {
    try {
      const result = await redis.set(`crave:lock:driver:${driverId}`, requestId, 'PX', ttlMs, 'NX')
      if (result === 'OK') {
        // Also update local cache for fast isDriverLocked checks
        offerLocks.set(driverId, {
          driverId,
          requestId,
          lockedAt: now,
          expiresAt: now + ttlMs,
        })
        return true
      }
      return false // Locked by another request
    } catch (e) {
      console.error('[atomic-lock] Redis error during acquire:', e)
      // In production, fail closed if Redis is configured but fails
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - cannot acquire distributed lock')
      }
    }
  }

  // In production, require Redis for distributed locking
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis required for distributed locking in production')
  }

  // Development fallback: Local memory lock (single-instance only)
  const existingLock = offerLocks.get(driverId)
  if (existingLock && existingLock.expiresAt > now) {
    if (existingLock.requestId === requestId) {
      return true // Already locked for this request
    }
    return false // Locked by another request
  }

  // Acquire lock in memory
  offerLocks.set(driverId, {
    driverId,
    requestId,
    lockedAt: now,
    expiresAt: now + ttlMs,
  })
  return true
}

/**
 * DEPRECATED: Use acquireDriverOfferLock instead.
 * Kept for backward compatibility with existing call sites.
 */
export async function tryLockDriverForOffer(
  driverId: string,
  requestId: string,
  ttlMs: number = DEFAULT_OFFER_TTL_MS
): Promise<boolean> {
  // Try distributed lock first
  if (isRedisAvailable() && redis) {
    const result = await redis.set(`crave:lock:driver:${driverId}`, requestId, 'PX', ttlMs, 'NX')
    if (result === 'OK') {
      offerLocks.set(driverId, {
        driverId,
        requestId,
        lockedAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
      })
      return true
    }
    return false
  }

  // In production, require Redis for distributed locking
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis required for distributed locking in production')
  }

  // Fallback to local
  const now = Date.now()
  const existingLock = offerLocks.get(driverId)
  if (existingLock && existingLock.expiresAt > now) {
    if (existingLock.requestId === requestId) return true
    return false
  }
  offerLocks.set(driverId, {
    driverId,
    requestId,
    lockedAt: now,
    expiresAt: now + ttlMs,
  })
  return true
}

/**
 * Check if a driver is currently locked by any dispatch offer (synchronous in-memory check)
 */
export function isDriverLocked(driverId: string): boolean {
  const now = Date.now()
  const lock = offerLocks.get(driverId)
  if (!lock) return false
  if (lock.expiresAt <= now) {
    offerLocks.delete(driverId)
    return false
  }
  return true
}

/**
 * Check if a driver is currently locked (distributed async check including Redis)
 */
export async function isDriverLockedAsync(driverId: string): Promise<boolean> {
  const now = Date.now()
  const lock = offerLocks.get(driverId)
  if (lock && lock.expiresAt > now) {
    return true
  }

  if (isRedisAvailable() && redis) {
    try {
      const redisLock = await redis.get(`crave:lock:driver:${driverId}`)
      if (redisLock) return true
    } catch (e) {
      console.error('[atomic-lock] Redis error during isDriverLockedAsync:', e)
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - cannot check distributed lock')
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis required for distributed lock check in production')
  }

  if (lock && lock.expiresAt <= now) {
    offerLocks.delete(driverId)
  }
  return false
}

/**
 * Release an offer lock manually (e.g. driver rejected offer or offer completed)
 * Uses atomic compare-and-delete in Redis (Lua script) for safety
 */
export async function releaseDriverLock(driverId: string, requestId?: string): Promise<boolean> {
  const lock = offerLocks.get(driverId)
  if (lock) {
    if (requestId && lock.requestId !== requestId) {
      return false // Lock owned by another request
    }
    offerLocks.delete(driverId)
  }

  if (isRedisAvailable() && redis) {
    try {
      const key = `crave:lock:driver:${driverId}`
      // Atomic compare-and-delete: only delete if value matches requestId
      if (requestId) {
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `
        const result = await redis.eval(luaScript, 1, key, requestId)
        return result === 1
      }
      // No requestId provided - just delete
      await redis.del(key)
      return true
    } catch (e) {
      console.error('[atomic-lock] Redis error during release:', e)
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - cannot release distributed lock')
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis required for distributed lock release in production')
  }

  return lock !== undefined
}

/**
 * Clear all locks (Utility for testing)
 */
export function clearAllOfferLocks(): void {
  offerLocks.clear()
}
