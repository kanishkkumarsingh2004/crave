import Redis, { type RedisOptions } from 'ioredis'

export type RedisEnvironmentMode =
  | 'disabled'
  | 'test'
  | 'explicit'
  | 'docker-compose'
  | 'local'
  | 'kubernetes-unconfigured'
  | 'production-unconfigured'

export interface RedisResolvedConfig {
  enabled: boolean
  url: string | null
  mode: RedisEnvironmentMode
  isProduction: boolean
  requiresExplicitUrl: boolean
  warning?: string
}

type GlobalWithRedis = typeof globalThis & {
  __redisClient: Redis | undefined
  __redisAvailable: boolean | undefined
  __redisWarnLogged: boolean | undefined
}

const g = globalThis as unknown as GlobalWithRedis

/**
 * Deterministically resolves Redis endpoint and configuration from environment.
 * Pure function: deterministic, robust, and directly testable without network side effects.
 *
 * Configuration Rules:
 * 1. REDIS_DISABLED === 'true' -> Disables Redis client creation unconditionally.
 * 2. NODE_ENV === 'test' && REDIS_TEST_ENABLE !== 'true' -> Disables Redis in test suites to prevent port leaks.
 * 3. Explicit REDIS_URL -> Authoritative source of truth for all environments.
 * 4. Kubernetes (KUBERNETES_SERVICE_HOST or KUBERNETES_PORT): Never assumes a universal 'redis' service name.
 *    Requires explicit REDIS_URL.
 * 5. Production (NODE_ENV === 'production'): Requires explicit REDIS_URL. Does not guess localhost or container names.
 * 6. Docker Compose (DOCKER_COMPOSE === 'true'): Selects internal service endpoint redis://redis:6379.
 * 7. Local Development: Selects documented local endpoint redis://127.0.0.1:6379 (or REDIS_HOST:REDIS_PORT).
 */
export function resolveRedisConfig(
  env: Record<string, string | undefined> = process.env
): RedisResolvedConfig {
  const isProduction = env.NODE_ENV === 'production'
  const isTest = env.NODE_ENV === 'test'
  const explicitUrl = env.REDIS_URL ? env.REDIS_URL.trim() : ''
  const isDisabled = env.REDIS_DISABLED === 'true'

  // 1. Explicit disable switch
  if (isDisabled) {
    return {
      enabled: false,
      url: null,
      mode: 'disabled',
      isProduction,
      requiresExplicitUrl: false,
    }
  }

  // 2. Test environment
  if (isTest && env.REDIS_TEST_ENABLE !== 'true') {
    return {
      enabled: false,
      url: null,
      mode: 'test',
      isProduction: false,
      requiresExplicitUrl: false,
    }
  }

  // 3. Explicit REDIS_URL is always authoritative
  if (explicitUrl) {
    return {
      enabled: true,
      url: explicitUrl,
      mode: 'explicit',
      isProduction,
      requiresExplicitUrl: false,
    }
  }

  // 4. Kubernetes detection: do NOT assume a universal 'redis' service name
  const isKubernetes = Boolean(env.KUBERNETES_SERVICE_HOST || env.KUBERNETES_PORT)
  if (isKubernetes) {
    return {
      enabled: false,
      url: null,
      mode: 'kubernetes-unconfigured',
      isProduction,
      requiresExplicitUrl: true,
      warning:
        'Kubernetes deployment detected but REDIS_URL is not configured. Explicit REDIS_URL is required to connect to the cluster Redis service.',
    }
  }

  // 5. Docker Compose environment (identified via DOCKER_COMPOSE env var)
  const isDockerCompose = env.DOCKER_COMPOSE === 'true' || env.IS_DOCKER_COMPOSE === 'true'
  if (isDockerCompose) {
    const host = env.REDIS_HOST || 'redis'
    const port = env.REDIS_PORT || '6379'
    return {
      enabled: true,
      url: `redis://${host}:${port}`,
      mode: 'docker-compose',
      isProduction,
      requiresExplicitUrl: false,
    }
  }

  // 6. Standalone production containers: do NOT guess localhost or internal names
  if (isProduction) {
    return {
      enabled: false,
      url: null,
      mode: 'production-unconfigured',
      isProduction: true,
      requiresExplicitUrl: true,
      warning:
        'Production environment detected without REDIS_URL. Explicit REDIS_URL must be configured for distributed multi-pod coordination.',
    }
  }

  // 7. Local Development default
  const localHost = env.REDIS_HOST || '127.0.0.1'
  const localPort = env.REDIS_PORT || '6379'
  return {
    enabled: true,
    url: `redis://${localHost}:${localPort}`,
    mode: 'local',
    isProduction: false,
    requiresExplicitUrl: false,
  }
}

/**
 * Creates an ioredis client instance conforming to resolved configuration.
 */
export function createRedisInstance(
  options: RedisOptions = {},
  env: Record<string, string | undefined> = process.env
): Redis | null {
  if (typeof window !== 'undefined') {
    return null
  }

  const config = resolveRedisConfig(env)

  if (config.warning && (env.NODE_ENV as string) !== 'test' && !g.__redisWarnLogged) {
    // Suppress during Next.js production build — the build runs in NODE_ENV=production
    // but without runtime env vars, so the warning fires once per compiled route worker.
    // At actual server startup the warning will still appear if REDIS_URL is missing.
    const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build'
    if (!isNextBuild) {
      g.__redisWarnLogged = true
      console.warn(`⚠️ [Redis] ${config.warning}`)
    }
  }

  if (!config.enabled || !config.url) {
    return null
  }

  try {
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

    const client = new Redis(config.url, defaultOptions)

    client.on('error', (err) => {
      if ((env.NODE_ENV as string) !== 'test' && !g.__redisWarnLogged) {
        g.__redisWarnLogged = true
        console.log(
          `ℹ️ [Redis] Redis endpoint not reachable (${err.message}). In-memory single-process fallback active.`
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

    client.on('end', () => {
      g.__redisAvailable = false
    })

    client.on('reconnecting', () => {
      g.__redisAvailable = false
    })

    // Attempt initial connect asynchronously
    client.connect().catch(() => {
      g.__redisAvailable = false
    })

    return client
  } catch (err: any) {
    if ((env.NODE_ENV as string) !== 'test') {
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
 * Returns complete Redis topology and distributed status.
 */
export function getRedisStatus(): {
  available: boolean
  mode: RedisEnvironmentMode
  isDistributed: boolean
  urlConfigured: boolean
} {
  const config = resolveRedisConfig()
  const available = isRedisAvailable()
  return {
    available,
    mode: config.mode,
    isDistributed: available,
    urlConfigured: Boolean(config.url),
  }
}

/**
 * Returns a dedicated subscriber instance for Redis Pub/Sub channels.
 */
export function createRedisSubscriber(
  env: Record<string, string | undefined> = process.env
): Redis | null {
  return createRedisInstance({ lazyConnect: false }, env)
}

/**
 * Gracefully shuts down the global Redis client.
 * Essential for zero leaked handles in test runs and process teardown.
 */
export async function closeRedisClient(): Promise<void> {
  if (g.__redisClient) {
    try {
      await g.__redisClient.quit()
    } catch {
      g.__redisClient.disconnect()
    } finally {
      g.__redisClient = undefined
      g.__redisAvailable = false
    }
  }
}
