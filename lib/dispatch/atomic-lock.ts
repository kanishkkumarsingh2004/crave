export interface OfferLock {
  driverId: string
  requestId: string
  lockedAt: number
  expiresAt: number
}

// In-Memory Lock Registry (Distributed Redis Lock interface pattern)
const offerLocks = new Map<string, OfferLock>()
const DEFAULT_OFFER_TTL_MS = 15 * 1000 // 15 seconds offer timeout window

/**
 * Attempt to acquire an atomic offer lock for a candidate driver.
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

  // Acquire lock atomically
  offerLocks.set(driverId, {
    driverId,
    requestId,
    lockedAt: now,
    expiresAt: now + ttlMs,
  })

  return true
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
  return true
}

/**
 * Clear all locks (Utility for testing)
 */
export function clearAllOfferLocks(): void {
  offerLocks.clear()
}
