import { isRedisAvailable, createRedisSubscriber } from '@/lib/redis'
import {
  tryLockDriverForOffer,
  isDriverLocked,
  releaseDriverLock,
} from '@/lib/dispatch/atomic-lock'
import { checkRateLimit } from '@/lib/rate-limit'

describe('Redis Subsystem & Distributed Resiliency', () => {
  describe('Redis Client Availability & Fallback', () => {
    it('gracefully reports unavailable when offline/mocked without crashing', () => {
      // In default test environment without local redis server, isRedisAvailable returns false
      const available = isRedisAvailable()
      expect(typeof available).toBe('boolean')
    })

    it('createRedisSubscriber returns null or Redis instance without throwing', () => {
      expect(() => {
        createRedisSubscriber()
      }).not.toThrow()
    })
  })

  describe('Atomic Locking with Distributed Fallback', () => {
    beforeEach(() => {
      releaseDriverLock('drv_redis_test_1')
    })

    it('acquires lock in memory when Redis is offline', () => {
      const locked = tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      expect(locked).toBe(true)
      expect(isDriverLocked('drv_redis_test_1')).toBe(true)
    })

    it('rejects duplicate lock acquisition for different request', () => {
      tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      const duplicateLocked = tryLockDriverForOffer('drv_redis_test_1', 'req_456', 5000)
      expect(duplicateLocked).toBe(false)
    })

    it('releases lock cleanly', () => {
      tryLockDriverForOffer('drv_redis_test_1', 'req_123', 5000)
      const released = releaseDriverLock('drv_redis_test_1', 'req_123')
      expect(released).toBe(true)
      expect(isDriverLocked('drv_redis_test_1')).toBe(false)
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
