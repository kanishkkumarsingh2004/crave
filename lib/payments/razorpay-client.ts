/**
 * lib/payments/razorpay-client.ts
 *
 * Server-only Razorpay client wrapper.
 *
 * Rules:
 * - Never import this from client code.
 * - Environment flags (RAZORPAY_ENABLED / RAZORPAY_ROUTE_ENABLED) are operational kill switches.
 * - Database PaymentConfig flags (razorpay_enabled / razorpay_route_enabled) are admin
 *   business controls. Both must permit an operation before it runs.
 * - Secrets are read only from process.env and never exposed to the client.
 */

import Razorpay from 'razorpay'

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function assertRazorpayEnabled() {
  if (process.env.RAZORPAY_ENABLED !== 'true') {
    throw new Error('Razorpay payments are disabled')
  }
}

export function getRazorpayClient(): Razorpay {
  assertRazorpayEnabled()
  return new Razorpay({
    key_id: requiredEnv('RAZORPAY_KEY_ID'),
    key_secret: requiredEnv('RAZORPAY_KEY_SECRET'),
  })
}

export function isRouteEnabled(): boolean {
  return (
    process.env.RAZORPAY_ENABLED === 'true' &&
    process.env.RAZORPAY_ROUTE_ENABLED === 'true'
  )
}

export function getWebhookSecret(): string {
  return requiredEnv('RAZORPAY_WEBHOOK_SECRET')
}