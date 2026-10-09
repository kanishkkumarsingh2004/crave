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
 * Uses Redis SET NX PX for cross-pod atomicity, falls back to local memory if Redis unavailable.
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
      console.warn('[atomic-lock] Redis unavailable, falling back to local lock:', e)
    }
  }

  // Fallback: Local memory lock (single-instance only)
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
    } catch (e) {}
  }

  if (lock && lock.expiresAt <= now) {
    offerLocks.delete(driverId)
  }
  return false
}

/**
 * Release an offer lock manually (e.g. driver rejected offer or offer completed)
 */
export async function releaseDriverLock(driverId: string, requestId?: string): Promise<boolean> {
  const lock = offerLocks.get(driverId)
  if (!lock) return false
  if (requestId && lock.requestId !== requestId) {
    return false // Lock owned by another request
  }
  offerLocks.delete(driverId)

  if (isRedisAvailable() && redis) {
    await redis.del(`crave:lock:driver:${driverId}`).catch(() => {})
  }

  return true
}

/**
 * Clear all locks (Utility for testing)
 */
export function clearAllOfferLocks(): void {
  offerLocks.clear()
}
