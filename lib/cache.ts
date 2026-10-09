import { redis, isRedisAvailable } from '@/lib/redis'

/**
 * Generic cache utilities with JSON serialization and TTL support
 * Gracefully falls back to null when Redis is unavailable
 */

export interface CacheOptions {
  ttlSeconds?: number
  namespace?: string
}

const DEFAULT_TTL = 60 // seconds
const DEFAULT_NAMESPACE = 'crave:cache'

function buildKey(key: string, namespace?: string): string {
  const ns = namespace || DEFAULT_NAMESPACE
  return `${ns}:${key}`
}

/**
 * Get a value from cache
 * Returns null if not found, expired, or Redis unavailable
 */
export async function cacheGet<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
  if (!isRedisAvailable() || !redis) return null

  try {
    const raw = await redis.get(buildKey(key, options.namespace))
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Set a value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: unknown,
  options: CacheOptions = {}
): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  try {
    const ttl = options.ttlSeconds || DEFAULT_TTL
    await redis.set(buildKey(key, options.namespace), JSON.stringify(value), 'EX', ttl)
    return true
  } catch {
    return false
  }
}

/**
 * Delete one or more keys from cache
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  if (!isRedisAvailable() || !redis || keys.length === 0) return 0

  try {
    const namespacedKeys = keys.map((k) => buildKey(k))
    const result = await redis.del(...namespacedKeys)
    return result
  } catch {
    return 0
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDelPattern(pattern: string, namespace?: string): Promise<number> {
  if (!isRedisAvailable() || !redis) return 0

  try {
    const patternKey = buildKey(pattern, namespace)
    const keys = await redis.keys(patternKey)
    if (keys.length === 0) return 0
    const result = await redis.del(...keys)
    return result
  } catch {
    return 0
  }
}

/**
 * Check if a key exists in cache
 */
export async function cacheExists(key: string, namespace?: string): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  try {
    const result = await redis.exists(buildKey(key, namespace))
    return result === 1
  } catch {
    return false
  }
}

/**
 * Get TTL for a key in seconds
 */
export async function cacheTTL(key: string, namespace?: string): Promise<number> {
  if (!isRedisAvailable() || !redis) return -2 // Key doesn't exist or Redis unavailable

  try {
    return await redis.ttl(buildKey(key, namespace))
  } catch {
    return -2
  }
}

/**
 * Cache-aside pattern helper: get from cache or fetch and cache
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await cacheGet<T>(key, options)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cacheSet(key, fresh, options)
  return fresh
}

// --- Specialized cache helpers for common entities ---

export const CacheKeys = {
  restaurants: {
    all: () => 'restaurants:all',
    byId: (id: string) => `restaurant:${id}`,
    open: () => 'restaurants:open',
    darkStores: () => 'restaurants:dark-stores',
  },
  menus: {
    byRestaurant: (restaurantId: string) => `menu:${restaurantId}`,
  },
  paymentConfig: {
    active: () => 'payment-config:active',
  },
  coupons: {
    byCode: (code: string) => `coupon:${code}`,
  },
  orderStatus: {
    byId: (orderId: string) => `order:${orderId}:status`,
  },
  adminStats: {
    daily: (date: string) => `stats:daily:${date}`,
  },
} as const

// --- TTL constants (in seconds) ---
export const CacheTTL = {
  RESTAURANTS: 30, // 30 seconds for restaurant listings
  MENU_ITEMS: 60, // 1 minute for menus
  PAYMENT_CONFIG: 30, // 30 seconds for payment config
  COUPONS: 60, // 1 minute for coupons
  ORDER_STATUS: 30, // 30 seconds for order status
  ADMIN_STATS: 60, // 1 minute for admin stats
} as const

// --- Admin Stats Helpers ---
export const AdminStatsCache = {
  async getDailyStats(date: string) {
    return cacheGet<any>(CacheKeys.adminStats.daily(date))
  },
  async setDailyStats(date: string, stats: any) {
    return cacheSet(CacheKeys.adminStats.daily(date), stats, { ttlSeconds: CacheTTL.ADMIN_STATS })
  },
  async invalidateDailyStats(date: string) {
    return cacheDel(CacheKeys.adminStats.daily(date))
  },
  async getOrderStatus(orderId: string) {
    return cacheGet<any>(CacheKeys.orderStatus.byId(orderId))
  },
  async setOrderStatus(orderId: string, status: any) {
    return cacheSet(CacheKeys.orderStatus.byId(orderId), status, {
      ttlSeconds: CacheTTL.ORDER_STATUS,
    })
  },
  async invalidateOrderStatus(orderId: string) {
    return cacheDel(CacheKeys.orderStatus.byId(orderId))
  },
}
