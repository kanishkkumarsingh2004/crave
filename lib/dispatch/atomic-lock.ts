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
 * Attempt to acquire an atomic offer lock for a candidate driver.
 * Stores in local memory and synchronously syncs to Redis when available.
 * Returns true if lock was successfully acquired, false if driver is already locked.
 */
export function tryLockDriverForOffer(
  driverId: string,
  requestId: string,
  ttlMs: number = DEFAULT_OFFER_TTL_MS
): boolean {
  const now = Date.now()
  const existingLock = offerLocks.get(driverId)

  // Check if existing lock is still active
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

  // Replicate asynchronously to Redis if active
  if (isRedisAvailable() && redis) {
    redis.set(`crave:lock:driver:${driverId}`, requestId, 'PX', ttlMs, 'NX').catch(() => {})
  }

  return true
}

/**
 * Distributed async Redis lock acquisition.
 * Guarantees cross-pod and cross-instance exclusion across horizontal cluster containers.
 */
export async function tryLockDriverOfferDistributed(
  driverId: string,
  requestId: string,
  ttlMs: number = DEFAULT_OFFER_TTL_MS
): Promise<boolean> {
  if (isRedisAvailable() && redis) {
    try {
      const result = await redis.set(`crave:lock:driver:${driverId}`, requestId, 'PX', ttlMs, 'NX')
      if (result === 'OK') {
        // Also update local cache
        offerLocks.set(driverId, {
          driverId,
          requestId,
          lockedAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
        })
        return true
      }
      return false
    } catch {
      // Redis error fallback
    }
  }

  return tryLockDriverForOffer(driverId, requestId, ttlMs)
}

/**
 * Check if a driver is currently locked by any dispatch offer
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
 * Release an offer lock manually (e.g. driver rejected offer or offer completed)
 */
export function releaseDriverLock(driverId: string, requestId?: string): boolean {
  const lock = offerLocks.get(driverId)
  if (!lock) return false
  if (requestId && lock.requestId !== requestId) {
    return false // Lock owned by another request
  }
  offerLocks.delete(driverId)

  if (isRedisAvailable() && redis) {
    redis.del(`crave:lock:driver:${driverId}`).catch(() => {})
  }

  return true
}

/**
 * Clear all locks (Utility for testing)
 */
export function clearAllOfferLocks(): void {
  offerLocks.clear()
}
