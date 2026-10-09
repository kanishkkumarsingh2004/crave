import { NextRequest } from 'next/server'
import { JWTPayload } from '@/lib/jwt'

/**
 * Test authentication utilities
 * Provides controlled authentication for testing without NODE_ENV bypasses
 */

// Mock user for testing
export const MOCK_TEST_USER: JWTPayload = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  restaurantId: 'test-restaurant-id',
}

export const MOCK_TEST_ADMIN: JWTPayload = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'admin',
}

export const MOCK_TEST_DRIVER: JWTPayload = {
  id: 'test-driver-id',
  email: 'driver@example.com',
  name: 'Test Driver',
  role: 'rider',
}

export const MOCK_TEST_VENDOR: JWTPayload = {
  id: 'test-vendor-id',
  email: 'vendor@example.com',
  name: 'Test Vendor',
  role: 'restaurant_vendor',
  restaurantId: 'test-restaurant-id',
}

// Test header names
export const TEST_AUTH_HEADER = 'x-test-auth'
export const TEST_ROLE_HEADER = 'x-test-role'
export const TEST_USER_ID_HEADER = 'x-test-user-id'

/**
 * Create a mock request with test authentication
 */
export function createTestRequest(
  method: string,
  url: string,
  body?: unknown,
  user: JWTPayload = MOCK_TEST_USER
): NextRequest {
  const headers = new Headers()
  headers.set('content-type', 'application/json')
  headers.set(TEST_AUTH_HEADER, 'true')
  headers.set(TEST_ROLE_HEADER, user.role)
  headers.set(TEST_USER_ID_HEADER, user.id)

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Extract test user from request headers
 */
export function getTestUser(request: Request): JWTPayload | null {
  const isTestAuth = request.headers.get(TEST_AUTH_HEADER) === 'true'
  if (!isTestAuth) return null

  const role = request.headers.get(TEST_ROLE_HEADER) || 'user'
  const userId = request.headers.get(TEST_USER_ID_HEADER) || 'test-user-id'

  return {
    id: userId,
    email: `test-${role}@example.com`,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    role: role as JWTPayload['role'],
    restaurantId: role === 'vendor' ? 'test-restaurant-id' : undefined,
  }
}

/**
 * Check if request is a test request
 */
export function isTestRequest(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  return request.headers.get(TEST_AUTH_HEADER) === 'true'
}

/**
 * Test environment configuration
 */
export const TEST_ENV_CONFIG = {
  // Test database configuration
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/crave_test',

  // Test JWT secret
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',

  // Test secrets
  WS_INTERNAL_SECRET: 'test-internal-secret-key-for-testing-only',

  // Test payment config
  PAYMENT_CONFIG: {
    merchantVPA: 'test@upi',
    merchantName: 'Test Merchant',
    gstRatePercent: 5,
    platformFee: 6,
    handlingFee: 5,
    vendorCommission: 15,
    packagingCap: 20,
    baseDeliveryFee: 35,
    baseDistanceKm: 5,
    perKmRate: 10,
    freeDeliveryThreshold: 500,
    driverPayoutShare: 80,
    surgeMultiplier: 1.5,
    rainFee: 15,
    nightSurgeFee: 10,
    enableCashOnDelivery: false,
    enableUpiDeepLink: true,
    requireUtrNumber: true,
    isActive: true,
  },
}

/**
 * Verify we're in a test environment
 */
export function assertTestEnvironment(): void {
  if (process.env.NODE_ENV !== 'test' && !process.env.CI) {
    throw new Error('Test utilities should only be used in test environment')
  }
}
