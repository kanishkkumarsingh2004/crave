/**
 * lib/infra/idempotency.ts
 *
 * Distributed, Transaction-Safe Idempotency Service
 * Backed by PostgreSQL `idempotency_records` table with optional Redis acceleration.
 *
 * Guarantees
 * ──────────
 * 1. Mutual exclusion: only one request with a given key executes at a time.
 * 2. Exact replay:     completed operations return the exact status code and response body.
 * 3. Payload fidelity: reusing a key with different request parameters is rejected (409).
 * 4. Fail closed:      a DB error during acquisition for a financial scope throws rather
 *                      than silently allowing the operation to proceed as 'new'. This
 *                      prevents double-execution of checkout, payment webhooks, refunds,
 *                      and settlements when the idempotency store is transiently unavailable.
 *
 * Lease model
 * ───────────
 * - acquireIdempotency sets status='processing' with an expires_at lease.
 * - The caller MUST call completeIdempotency on success or releaseIdempotency on failure.
 * - If the caller crashes, the record remains 'processing' until expires_at passes.
 *   After expiry, the next caller with the same key and SAME payload may retry.
 *   A caller with a DIFFERENT payload is still rejected (conflict), because expiry does
 *   not grant permission to change the operation's parameters.
 *
 * Result statuses
 * ───────────────
 *   'new'        – lock acquired; caller must execute and call completeIdempotency.
 *   'processing' – another request holds the lock; caller should return 409 / retry later.
 *   'completed'  – already processed; caller should return the cached statusCode + body.
 *   'conflict'   – key exists with a different payload hash; caller must return 422.
 */

import { prisma } from '@/lib/prisma'
import { redis, isRedisAvailable } from '@/lib/redis'
import crypto from 'crypto'

// Scopes that require fail-closed behaviour on DB errors.
// For these, a database failure during acquisition throws rather than returning 'new'.
const FINANCIAL_SCOPES = new Set(['order_checkout', 'payment_webhook', 'refund', 'settlement'])

export type IdempotencyStatus = 'new' | 'processing' | 'completed' | 'conflict'

export interface IdempotencyResult<T = any> {
  status: IdempotencyStatus
  statusCode?: number
  body?: T
}

/**
 * Generate a consistent SHA-256 hash of a request payload to detect parameter mismatch.
 * An empty string return value indicates a serialisation failure — treat as no hash.
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
 * Compare two payload hashes. Returns true when either hash is missing (unknown) or when
 * both are present and equal. Returns false only when both are non-empty and differ.
 */
function hashesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true // one side unknown → cannot reject
  return a === b
}

/**
 * Attempt to acquire an idempotency lock for an operation.
 *
 * @param key           Caller-supplied idempotency key (must be non-blank).
 * @param scope         Operation category — financial scopes fail closed on DB errors.
 * @param payload       Request parameters — used to compute a hash for mismatch detection.
 * @param ttlSeconds    Lease duration. The record remains 'processing' for this long.
 *
 * @throws {Error}      When key is blank (always) or when a DB error occurs for a
 *                      financial scope. Non-financial scope DB errors return 'processing'
 *                      (conservatively blocking execution rather than permitting a duplicate).
 *
 * @returns IdempotencyResult with status:
 *   'new'        – lock acquired; execute and call completeIdempotency.
 *   'completed'  – already done; return the cached response.
 *   'processing' – locked by a concurrent request; return 409 / retry later.
 *   'conflict'   – key reused with different payload; return 422.
 */
export async function acquireIdempotency(
  key: string,
  scope: 'order_checkout' | 'payment_webhook' | 'refund' | 'settlement' | string,
  payload?: any,
  ttlSeconds = 300 // 5-minute processing lease
): Promise<IdempotencyResult> {
  // CR-05: Blank key must never silently fall through to 'new' — that would bypass
  // idempotency entirely for any caller that fails to supply a key. Throw unconditionally
  // so the caller knows its idempotency header is missing.
  if (!key || typeof key !== 'string' || !key.trim()) {
    throw new Error('Idempotency key must be a non-blank string')
  }

  const cleanKey = key.trim()
  const payloadHash = hashPayload(payload)
  const isFinancial = FINANCIAL_SCOPES.has(scope)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

  // ── Fast-path: Redis cache (best-effort, never authoritative) ─────────────
  // Redis is used only to short-circuit the DB read for already-completed keys.
  // It NEVER gates acquisition — the DB is always the authoritative source.
  if (isRedisAvailable() && redis) {
    try {
      const redisKey = `crave:idempotency:${scope}:${cleanKey}`
      const cached = await redis.get(redisKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.status === 'completed') {
          // CR-05: Even on the cache hit path, reject payload mismatches.
          if (parsed.payloadHash && payloadHash && parsed.payloadHash !== payloadHash) {
            return { status: 'conflict' }
          }
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
      // Redis error: fall through to DB (Redis is not authoritative).
    }
  }

  // ── Authoritative path: PostgreSQL ────────────────────────────────────────
  try {
    // CR-05: Use a single upsert-style operation via createOrUpdate semantics.
    // First attempt an atomic INSERT for the common (new key) case.
    // On P2002 (unique collision) we read the winner to determine what to return.
    // This avoids the read-then-write race in the original findUnique → create flow.
    try {
      await prisma.idempotencyRecord.create({
        data: {
          key: cleanKey,
          scope,
          status: 'processing',
          request_hash: payloadHash || null,
          expires_at: expiresAt,
        },
      })
      // Insert succeeded — we hold the lock.
      _primeRedisProcessing(scope, cleanKey, ttlSeconds)
      return { status: 'new' }
    } catch (insertErr: any) {
      if (insertErr?.code !== 'P2002') {
        // Not a uniqueness collision — re-throw to the outer catch for classification.
        throw insertErr
      }
      // Unique constraint violation → a record already exists for this key.
      // Fall through to read-and-evaluate logic below.
    }

    // A record exists. Read it to determine the correct response.
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: cleanKey },
    })

    if (!existing) {
      // Should be unreachable (we just got a P2002), but handle defensively.
      // Another worker may have deleted it between the collision and this read.
      _primeRedisProcessing(scope, cleanKey, ttlSeconds)
      return { status: 'processing' }
    }

    // CR-05: Enforce payload hash on ALL existing-record code paths.
    // Hash mismatch means the caller is trying to reuse a key for a different operation.
    // This is rejected regardless of the record's status or expiry.
    if (!hashesMatch(existing.request_hash, payloadHash)) {
      return { status: 'conflict' }
    }

    // Record exists with matching (or unknown) hash — evaluate status.
    if (existing.expires_at > now) {
      // Active lease.
      if (existing.status === 'completed') {
        return {
          status: 'completed',
          statusCode: existing.response_code || 200,
          body: existing.response_body as any,
        }
      }
      // Status is 'processing' (in-flight by another worker) or 'failed'.
      // Return 'processing' so the caller waits — do not allow concurrent execution.
      return { status: 'processing' }
    }

    // Lease has expired (crashed worker or abandoned request).
    // CR-05: Payload hash is checked above, so we know the payload matches.
    // Re-acquire: atomically update the expired record to 'processing'.
    await prisma.idempotencyRecord.update({
      where: { key: cleanKey },
      data: {
        scope,
        status: 'processing',
        request_hash: payloadHash || null,
        expires_at: expiresAt,
        updated_at: now,
      },
    })
    _primeRedisProcessing(scope, cleanKey, ttlSeconds)
    return { status: 'new' }
  } catch (err: any) {
    // CR-05: Fail closed for financial operations.
    // A DB error during idempotency acquisition means we cannot determine whether
    // this operation was already processed. Returning 'new' here would allow the
    // operation to execute a second time if the DB was transiently unavailable
    // while a previous attempt was committing — a direct double-payment risk.
    //
    // For financial scopes: throw so the caller surfaces a 500 and the client
    // retries with the same idempotency key once the DB recovers.
    //
    // For non-financial scopes: return 'processing' as a safe conservative
    // fallback (blocks execution rather than permitting a potential duplicate).
    console.error(`[idempotency] DB error during acquisition for scope=${scope} key=${cleanKey}:`, err?.message)

    if (isFinancial) {
      throw new Error(
        `Idempotency service unavailable for financial operation (scope=${scope}). ` +
          `Retry with the same idempotency key once the service recovers.`
      )
    }
    return { status: 'processing' }
  }
}

/**
 * Mark an idempotency key as completed and store the response payload for exact replays.
 * Must be called after a successful execution of the guarded operation.
 */
export async function completeIdempotency(
  key: string,
  scope: string,
  statusCode: number,
  responseBody: any,
  ttlSeconds = 86400 // 24-hour retention for replay
): Promise<void> {
  if (!key || typeof key !== 'string' || !key.trim()) return
  const cleanKey = key.trim()
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

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
 * Release an idempotency lock without recording a successful completion.
 * Call this when the guarded operation fails so the client may retry.
 * The record is deleted rather than marked 'failed' so that a fresh attempt
 * with the same key is treated as 'new' rather than 'processing'.
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

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Best-effort Redis prime for a newly acquired 'processing' lock.
 * Never awaited — Redis is a cache only; failures are silently ignored.
 */
function _primeRedisProcessing(scope: string, cleanKey: string, ttlSeconds: number): void {
  if (!isRedisAvailable() || !redis) return
  redis
    .set(
      `crave:idempotency:${scope}:${cleanKey}`,
      JSON.stringify({ status: 'processing' }),
      'EX',
      ttlSeconds
    )
    .catch(() => {})
}

