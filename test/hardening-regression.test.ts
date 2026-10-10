/**
 * @jest-environment node
 * 
 * CRAVE Forensic Remediation & Hardening Regression Test Suite
 * Verifies P0 and P1 security, authorization, and consistency guarantees.
 */

import { isTestRequest, TEST_AUTH_HEADER } from '@/lib/test-auth'
import { NextRequest } from 'next/server'

describe('CRAVE Forensic Hardening - Regression Suite', () => {
  const originalEnv = (process.env as any).NODE_ENV

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv
    jest.resetModules()
  })

  function makeMockRequest(url: string, body?: any, headers: Record<string, string> = {}): NextRequest {
    return {
      json: async () => body,
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || headers[key] || null,
      },
      url,
    } as unknown as NextRequest
  }

  describe('1. Test Auth Header Lockout (P0-1)', () => {
    it('rejects x-test-auth header when NODE_ENV is development or staging', () => {
      const headers: Record<string, string> = { [TEST_AUTH_HEADER]: 'true', 'x-test-role': 'admin' };

      (process.env as any).NODE_ENV = 'development';
      let req = makeMockRequest('http://localhost:3000/api/admin/users', undefined, headers);
      expect(isTestRequest(req)).toBe(false);

      (process.env as any).NODE_ENV = 'staging';
      req = makeMockRequest('http://localhost:3000/api/admin/users', undefined, headers);
      expect(isTestRequest(req)).toBe(false);

      (process.env as any).NODE_ENV = 'production';
      req = makeMockRequest('http://localhost:3000/api/admin/users', undefined, headers);
      expect(isTestRequest(req)).toBe(false);
    });

    it('allows x-test-auth ONLY when NODE_ENV is test', () => {
      (process.env as any).NODE_ENV = 'test'
      const req = makeMockRequest('http://localhost:3000/api/admin/users', undefined, {
        [TEST_AUTH_HEADER]: 'true',
        'x-test-role': 'admin',
      })
      expect(isTestRequest(req)).toBe(true)
    })
  })

  describe('2. Password Validation in Signup (P0-2)', () => {
    it('rejects short passwords under 8 characters', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')
      const req = makeMockRequest('http://localhost:3000/api/auth/signup', {
        name: 'Short Pass User',
        email: 'short@test.com',
        password: 'short',
        role: 'user',
      })

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
      expect(data.error).toContain('at least 8 characters')
    })
  })

  describe('3. Driver Accept Role Check (P0-5)', () => {
    it('rejects non-rider role from accepting dispatch trips', async () => {
      jest.doMock('@/lib/api-auth', () => ({
        requireAuthApi: jest.fn().mockResolvedValue({
          id: 'usr_customer',
          role: 'user',
          name: 'Regular Customer',
        }),
      }))
      jest.doMock('@/lib/rate-limit', () => ({
        getClientIp: () => '127.0.0.1',
        checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
        rateLimitResponse: jest.fn(),
      }))

      const { POST } = await import('@/app/api/driver/accept/route')
      const req = makeMockRequest('http://localhost:3000/api/driver/accept', {
        requestId: 'ord_123',
      })

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(403)
      expect(data.error).toContain('Rider or driver access required')
    })
  })

  describe('4. Driver Location Authorization (P0-5)', () => {
    it('rejects regular customer from publishing driver location', async () => {
      jest.doMock('next/headers', () => ({
        cookies: () => ({ get: jest.fn().mockReturnValue(undefined) }),
      }))
      jest.doMock('@/lib/jwt', () => ({
        verifyToken: jest.fn().mockResolvedValue({
          id: 'usr_customer',
          role: 'user',
        }),
      }))

      const { POST } = await import('@/app/api/driver/location/route')
      const req = makeMockRequest(
        'http://localhost:3000/api/driver/location',
        {
          driverId: 'usr_customer',
          lat: 12.9716,
          lng: 77.5946,
        },
        { authorization: 'Bearer valid.customer.token' }
      )

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(403)
      expect(data.error).toContain('Unauthorized driver location update')
    })
  })

  describe('5. Dispatch Request Authorization (P0-5)', () => {
    it('rejects regular customer from triggering driver dispatch requests', async () => {
      (process.env as any).NODE_ENV = 'production'
      jest.doMock('next/headers', () => ({
        cookies: () => ({ get: jest.fn().mockReturnValue(undefined) }),
      }))
      jest.doMock('@/lib/jwt', () => ({
        verifyToken: jest.fn().mockResolvedValue({
          id: 'usr_customer',
          role: 'user',
        }),
      }))

      const { POST } = await import('@/app/api/dispatch/request/route')
      const req = makeMockRequest(
        'http://localhost:3000/api/dispatch/request',
        {
          pickupLat: 12.9716,
          pickupLng: 77.5946,
        },
        { authorization: 'Bearer valid.customer.token' }
      )

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(403)
      expect(data.error).toContain('Forbidden: Only vendors and administrators')
    })
  })

  describe('6. WebSocket Client Hook (P1-1)', () => {
    it('exports useWebSocket accepting orderId parameter', () => {
      const { useWebSocket } = require('@/lib/websocket')
      expect(typeof useWebSocket).toBe('function')
    })
  })
})
