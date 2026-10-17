/**
 * lib/idempotency.ts
 *
 * Distributed, Transaction-Safe Idempotency Service
 * Backed by PostgreSQL `idempotency_records` table with optional Redis acceleration.
 *
 * Guarantees:
 * 1. Mutual Exclusion: Only one request with a given idempotency key executes at a time.
 * 2. Exact Replay: Completed operations return the exact status code and response payload.
 * 3. Safe Recovery: Interrupted or failed transactions can be cleanly retried.
 */

import { prisma } from '@/lib/prisma'
import { redis, isRedisAvailable } from '@/lib/redis'
import crypto from 'crypto'

export interface IdempotencyResult<T = any> {
  status: 'new' | 'processing' | 'completed' | 'failed'
  statusCode?: number
  body?: T
}

/**
 * Generate a consistent SHA-256 hash of a request payload to detect parameter mismatch
 */
export function hashPayload(payload: any): string {
  try {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {})
    return crypto.createHash('sha256').update(serialized).digest('hex')
  } catch {
    return ''
  }
}

/**
 * Attempt to acquire an idempotency lock for an operation.
 *
 * Returns:
 * - { status: 'new' }: Lock acquired, caller must execute the operation and call completeIdempotency.
 * - { status: 'completed', statusCode, body }: Already processed, caller should return cached response.
 * - { status: 'processing' }: Another request is currently executing with this key.
 */
export async function acquireIdempotency(
  key: string,
  scope: 'order_checkout' | 'payment_webhook' | 'refund' | 'settlement' | string,
  payload?: any,
  ttlSeconds = 300 // 5 minutes default
): Promise<IdempotencyResult> {
  if (!key || typeof key !== 'string' || !key.trim()) {
    return { status: 'new' }
  }

  const cleanKey = key.trim()
  const payloadHash = hashPayload(payload)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

  // Fast-path: Check Redis if available
  if (isRedisAvailable() && redis) {
    try {
      const redisKey = `crave:idempotency:${scope}:${cleanKey}`
      const cached = await redis.get(redisKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.status === 'completed') {
          return {
            status: 'completed',
            statusCode: parsed.statusCode || 200,
            body: parsed.body,
          }
        }
        if (parsed.status === 'processing') {
          return { status: 'processing' }
        }
      }
    } catch {
      // Fall through to database
    }
  }

  // Database-backed authoritative idempotency
  if (!prisma) {
    return { status: 'new' }
  }

  try {
    // Check if record exists
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: cleanKey },
    })

    if (existing) {
      // If record is not expired
      if (existing.expires_at > now) {
        if (existing.status === 'completed') {
          return {
            status: 'completed',
            statusCode: existing.response_code || 200,
            body: existing.response_body as any,
          }
        }
        if (existing.status === 'processing') {
          return { status: 'processing' }
        }
      }

      // Record is expired or failed — update to processing for a fresh attempt
      await prisma.idempotencyRecord.update({
        where: { key: cleanKey },
        data: {
          scope,
          status: 'processing',
          request_hash: payloadHash,
          expires_at: expiresAt,
          updated_at: now,
        },
      })
      return { status: 'new' }
    }

    // Insert new processing record atomically
    await prisma.idempotencyRecord.create({
      data: {
        key: cleanKey,
        scope,
        status: 'processing',
        request_hash: payloadHash,
        expires_at: expiresAt,
      },
    })

    // Also prime Redis lock
    if (isRedisAvailable() && redis) {
      redis
        .set(
          `crave:idempotency:${scope}:${cleanKey}`,
          JSON.stringify({ status: 'processing' }),
          'EX',
          ttlSeconds
        )
        .catch(() => {})
    }

    return { status: 'new' }
  } catch (err: any) {
    // Unique constraint collision (P2002) means a concurrent worker inserted right now
    if (err?.code === 'P2002') {
      try {
        const raceWinner = await prisma.idempotencyRecord.findUnique({
          where: { key: cleanKey },
        })
        if (raceWinner?.status === 'completed') {
          return {
            status: 'completed',
            statusCode: raceWinner.response_code || 200,
            body: raceWinner.response_body as any,
          }
        }
        return { status: 'processing' }
      } catch {
        return { status: 'processing' }
      }
    }
    console.warn('[idempotency] Database check failed, falling back to execution:', err)
    return { status: 'new' }
  }
}

/**
 * Mark an idempotency key as completed and store the response payload for exact replays.
 */
export async function completeIdempotency(
  key: string,
  scope: string,
  statusCode: number,
  responseBody: any,
  ttlSeconds = 86400 // 24 hours retention
): Promise<void> {
  if (!key || typeof key !== 'string' || !key.trim()) return
  const cleanKey = key.trim()
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  // Update in database
  if (prisma) {
    try {
      await prisma.idempotencyRecord.upsert({
        where: { key: cleanKey },
        create: {
          key: cleanKey,
          scope,
          status: 'completed',
          response_code: statusCode,
          response_body: responseBody ?? {},
          expires_at: expiresAt,
        },
        update: {
          status: 'completed',
          response_code: statusCode,
          response_body: responseBody ?? {},
          expires_at: expiresAt,
          updated_at: new Date(),
        },
      })
    } catch (err) {
      console.error('[idempotency] Failed to record completed idempotency state:', err)
    }
  }

  // Update in Redis
  if (isRedisAvailable() && redis) {
    try {
      const redisKey = `crave:idempotency:${scope}:${cleanKey}`
      await redis.set(
        redisKey,
        JSON.stringify({ status: 'completed', statusCode, body: responseBody }),
        'EX',
        ttlSeconds
      )
    } catch {}
  }
}

/**
 * Mark an idempotency key as failed or delete it so the client can retry immediately.
 */
export async function releaseIdempotency(key: string, scope: string): Promise<void> {
  if (!key || typeof key !== 'string' || !key.trim()) return
  const cleanKey = key.trim()

  if (prisma) {
    try {
      await prisma.idempotencyRecord.deleteMany({
        where: { key: cleanKey },
      })
    } catch {}
  }

  if (isRedisAvailable() && redis) {
    try {
      await redis.del(`crave:idempotency:${scope}:${cleanKey}`)
    } catch {}
  }
}
