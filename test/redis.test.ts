import {
  isRedisAvailable,
  createRedisSubscriber,
  resolveRedisConfig,
  createRedisInstance,
  getRedisStatus,
} from '@/lib/redis'
import {
  tryLockDriverForOffer,
  isDriverLocked,
  releaseDriverLock,
  acquireDriverOfferLock,
} from '@/lib/dispatch/atomic-lock'
import { checkRateLimit } from '@/lib/rate-limit'

describe('Redis Subsystem & Distributed Resiliency', () => {
  describe('Deterministic Endpoint Resolution (resolveRedisConfig)', () => {
    it('gives explicit REDIS_URL highest precedence over any inferred default', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'development',
        DOCKER_COMPOSE: 'true',
        KUBERNETES_SERVICE_HOST: '10.0.0.1',
        REDIS_URL: 'redis://custom-managed-redis.internal:6380/2',
      })

      expect(config.enabled).toBe(true)
      expect(config.url).toBe('redis://custom-managed-redis.internal:6380/2')
      expect(config.mode).toBe('explicit')
      expect(config.requiresExplicitUrl).toBe(false)
    })

    it('selects the documented local endpoint in local development', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'development',
      })

      expect(config.enabled).toBe(true)
      expect(config.url).toBe('redis://127.0.0.1:6379')
      expect(config.mode).toBe('local')
      expect(config.requiresExplicitUrl).toBe(false)
    })

    it('selects custom REDIS_HOST and REDIS_PORT when specified in local development', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'development',
        REDIS_HOST: '192.168.1.50',
        REDIS_PORT: '6381',
      })

      expect(config.enabled).toBe(true)
      expect(config.url).toBe('redis://192.168.1.50:6381')
      expect(config.mode).toBe('local')
    })

    it('selects documented internal service endpoint in Docker Compose', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'production',
        DOCKER_COMPOSE: 'true',
      })

      expect(config.enabled).toBe(true)
      expect(config.url).toBe('redis://redis:6379')
      expect(config.mode).toBe('docker-compose')
    })

    it('requires explicit configuration in Kubernetes rather than assuming universal service name', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'production',
        KUBERNETES_SERVICE_HOST: '10.96.0.1',
        KUBERNETES_PORT: '443',
      })

      expect(config.enabled).toBe(false)
      expect(config.url).toBeNull()
      expect(config.mode).toBe('kubernetes-unconfigured')
      expect(config.requiresExplicitUrl).toBe(true)
      expect(config.warning).toContain('Kubernetes deployment detected')
    })

    it('requires explicit REDIS_URL in standalone production environments', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'production',
      })

      expect(config.enabled).toBe(false)
      expect(config.url).toBeNull()
      expect(config.mode).toBe('production-unconfigured')
      expect(config.requiresExplicitUrl).toBe(true)
    })

    it('unconditionally disables Redis when REDIS_DISABLED is true', () => {
      const config = resolveRedisConfig({
        REDIS_DISABLED: 'true',
        REDIS_URL: 'redis://redis:6379',
      })

      expect(config.enabled).toBe(false)
      expect(config.url).toBeNull()
      expect(config.mode).toBe('disabled')
    })

    it('safely disables Redis in test mode to prevent background network leaks', () => {
      const config = resolveRedisConfig({
        NODE_ENV: 'test',
      })

      expect(config.enabled).toBe(false)
      expect(config.url).toBeNull()
      expect(config.mode).toBe('test')
    })
  })

  describe('Redis Client Availability & Fallback', () => {
    it('gracefully reports unavailable when offline/mocked without crashing', () => {
      const available = isRedisAvailable()
      expect(typeof available).toBe('boolean')
      const status = getRedisStatus()
      expect(status).toHaveProperty('available')
      expect(status).toHaveProperty('mode')
      expect(status).toHaveProperty('isDistributed')
    })

    it('createRedisSubscriber returns null or Redis instance without throwing', () => {
      expect(() => {
        createRedisSubscriber()
      }).not.toThrow()
    })

    it('test mode does not create active Redis instance', () => {
      const client = createRedisInstance({}, { NODE_ENV: 'test' })
      expect(client).toBeNull()
    })

    it('disabled mode does not create active Redis instance', () => {
      const client = createRedisInstance({}, { REDIS_DISABLED: 'true' })
      expect(client).toBeNull()
    })
  })

  describe('Atomic Locking with Distributed Fallback', () => {
    beforeEach(() => {
      releaseDriverLock('drv_redis_test_1')
    })

    it('acquires lock in memory when Redis is offline in dev/test', async () => {
      const locked = await tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      expect(locked).toBe(true)
      expect(isDriverLocked('drv_redis_test_1')).toBe(true)
    })

    it('rejects duplicate lock acquisition for different request', async () => {
      await tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      const duplicateLocked = await tryLockDriverForOffer('drv_redis_test_1', 'req_456', 5000)
      expect(duplicateLocked).toBe(false)
    })

    it('releases lock cleanly', async () => {
      await tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      const released = await releaseDriverLock('drv_redis_test_1', 'req_123')
      expect(released).toBe(true)
      expect(isDriverLocked('drv_redis_test_1')).toBe(false)
    })

    it('fails closed in production mode when Redis is required but unavailable', async () => {
      const originalEnv = process.env.NODE_ENV
      try {
        ;(process.env as any).NODE_ENV = 'production'
        await expect(acquireDriverOfferLock('drv_prod_test', 'req_prod_1', 5000)).rejects.toThrow(
          'Redis required for distributed locking in production'
        )
      } finally {
        ;(process.env as any).NODE_ENV = originalEnv
      }
    })
  })

  describe('Distributed Rate Limiting with Fallback', () => {
    it('checkRateLimit enforces window limit', async () => {
      const ip = '192.168.1.100'
      const first = await checkRateLimit(`test_${ip}`, 'PUBLIC')
      expect(first.allowed).toBe(true)
      expect(first.remaining).toBe(99)
    })

    it('checkRateLimit enforces tier limits', async () => {
      const ip = '192.168.1.101'
      // Use AUTH_LOGIN tier (5 req/5min)
      const result = await checkRateLimit(`test_${ip}`, 'AUTH_LOGIN')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })
})
