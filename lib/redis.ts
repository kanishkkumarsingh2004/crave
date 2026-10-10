import Redis, { type RedisOptions } from 'ioredis'
import fs from 'fs'

type GlobalWithRedis = typeof globalThis & {
  __redisClient: Redis | undefined
  __redisAvailable: boolean | undefined
}

const g = globalThis as unknown as GlobalWithRedis

function createRedisInstance(options: RedisOptions = {}): Redis | null {
  if (typeof window !== 'undefined') {
    return null
  }

  // Auto-detect Redis URL based on environment
  // - Local dev: uses localhost:6380 (docker-compose host port)
  // - Docker/production: uses redis:6379 (container network)
  // - Render/production: uses REDIS_URL env var if provided
  let redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    // Detect if running inside Docker container
    const inDocker = process.env.DOCKER_CONTAINER === 'true' || 
      fs.existsSync('/.dockerenv') || 
      process.env.KUBERNETES_SERVICE_HOST !== undefined

    if (inDocker) {
      redisUrl = 'redis://redis:6379' // Docker internal network
    } else {
      redisUrl = 'redis://localhost:6380' // Local dev with docker-compose host port
    }
  }

  // Allow disabling via explicit env var or when REDIS_URL is not provided
  if (process.env.REDIS_DISABLED === 'true' || (process.env.NODE_ENV as string) === 'test') {
    return null
  }

  try {
    let warnLogged = false
    const defaultOptions: RedisOptions = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 1) return null // Stop retrying after 1 attempt if offline
        return 300
      },
      lazyConnect: true,
      ...options,
    }

    const client = redisUrl ? new Redis(redisUrl, defaultOptions) : new Redis(defaultOptions)

    client.on('error', (err) => {
      // Gracefully log single notice without crashing or spamming
      if ((process.env.NODE_ENV as string) !== 'test' && !warnLogged) {
        warnLogged = true
        console.log(
          `ℹ️ [Redis] Local Redis not detected (${err.message}). Using in-memory fallback.`
        )
      }
      g.__redisAvailable = false
    })

    client.on('ready', () => {
      g.__redisAvailable = true
    })

    client.on('close', () => {
      g.__redisAvailable = false
    })

    // Attempt initial connect asynchronously
    client.connect().catch(() => {
      g.__redisAvailable = false
    })

    return client
  } catch (err: any) {
    if ((process.env.NODE_ENV as string) !== 'test') {
      console.warn('⚠️ [Redis] Client initialization skipped:', err?.message)
    }
    return null
  }
}

export const redis: Redis | null = g.__redisClient ?? createRedisInstance()

if (redis !== null) {
  g.__redisClient = redis
}

/**
 * Check if Redis connection is active and ready for operations.
 */
export function isRedisAvailable(): boolean {
  if (!redis) return false
  return g.__redisAvailable === true || redis.status === 'ready'
}

/**
 * Returns a dedicated subscriber instance for Redis Pub/Sub channels.
 */
export function createRedisSubscriber(): Redis | null {
  return createRedisInstance({ lazyConnect: false })
}
