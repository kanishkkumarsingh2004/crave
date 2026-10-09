# CRAVE — Full Platform Audit Report

**Repository:** `https://github.com/kanishkkumarsingh2004/crave`  
**Base Commit:** `a8350d56` — *RESIS IMPLEMENTSTION part 2* (2026-10-09)  
**Audit Date:** 2026-10-09  
**Auditor:** Independent Full-Stack Code Review  
**Scope:** Security · Stability · Scalability · Redis · Architecture · Code Quality · DevOps · Feature Completeness  
**Related Documents:**  
- `docs/CRAVE_SECURITY_audit.md` (SAST / security test plan)  
- Previous stability & Redis gap analyses  

---

## 1. Executive Summary

Crave is an enterprise-grade multi-vendor food + 10-minute dark-store grocery delivery platform built on:

- **Next.js 16** (App Router, SWC)
- **TypeScript** (strict)
- **PostgreSQL 16 + Prisma 7**
- **Uber H3** geospatial dispatch (`h3-js`)
- **Standalone WebSocket server** (`ws-server.js`)
- **Redis 7** (rate-limit, locks, location write, JWT blacklist, WS pub/sub)
- **Commercial pricing engine** (`lib/calculator.ts`)

### Overall Score: **84 / 100** (B+)

| Dimension | Score | Grade |
|-----------|------:|:-----:|
| Security | 82 | B |
| Stability | 85 | B |
| Architecture | 88 | B+ |
| Scalability | 76 | C+ |
| Redis Maturity | 78 | C+ |
| Code Quality | 83 | B |
| Performance | 81 | B |
| DevOps | 80 | B |
| Feature Completeness | 89 | B+ |
| **Overall** | **84** | **B+** |

**Verdict:** Production-capable for single-instance and small multi-pod deployments. Core commercial math, auth (with JWT blacklist), rate-limiting, and real-time WS are strong. Remaining blockers for full horizontal scale are the in-memory H3 spatial index and local-first dispatch locks.

---

## 2. System Topology

```
┌─────────────────────┐     HTTP / REST          ┌──────────────────────┐
│  crave-frontend     │◄────────────────────────►│  Next.js App Router  │
│  Port :3000         │                          │  app/ + API routes   │
└──────────┬──────────┘                          └──────────┬───────────┘
           │                                                │ Prisma
           │  ws://…:8000/api/ws                            ▼
           │                                     ┌──────────────────────┐
           └────────────────────────────────────►│  PostgreSQL 16       │
                                                 └──────────────────────┘
┌─────────────────────┐     POST /__ws/broadcast
│  crave-backend      │◄──────────────────────── (internal secret)
│  ws-server.js :8000 │
└──────────┬──────────┘
           │ Redis Pub/Sub
           ▼
     [Redis 7]
```

Four portals: `/user/*`, `/vendor/*`, `/driver/*`, `/admin/*`.

---

## 3. Score Dashboard

```
Security ...............  82  ████████░░
Stability ..............  85  ████████░░
Architecture ...........  88  █████████░
Scalability ............  76  ███████░░░
Redis Maturity .........  78  ███████░░░
Code Quality ...........  83  ████████░░
Performance ............  81  ████████░░
DevOps .................  80  ████████░░
Feature Completeness ...  89  █████████░
────────────────────────────────────
OVERALL ................  84  ████████░░
```

---

## 4. File-by-File Audit

### 4.1 Core Infrastructure

#### `lib/redis.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ PASS |
| **Purpose** | Singleton `ioredis` client, availability flag, subscriber factory |
| **Strengths** | Graceful fallback when Redis down; disabled in test; `lazyConnect` |
| **Issues** | None critical |
| **Recommendation** | Keep as-is |

#### `lib/rate-limit.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG |
| **Purpose** | Distributed rate limiting with tiers + memory fallback |
| **Strengths** | Pipeline INCR/PTTL/PEXPIRE; clear tiers (AUTH_LOGIN, ORDER_CREATE, etc.); `withRateLimit` HOC |
| **Issues** | None critical |
| **Recommendation** | Ensure all sensitive routes use `withRateLimit` |

#### `lib/jwt.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG (recently improved) |
| **Purpose** | Token create/verify + Redis JWT blacklist |
| **Strengths** | Uses `jose`; JTI claim; per-token + per-user blacklist; TTL aligned to token expiry |
| **Issues** | Fallback secret hardcoded for non-production (`REDACTED_JWT_SECRET`) |
| **Recommendation** | Never ship fallback secret into any shared/staging environment; rotate production `JWT_SECRET` |

#### `lib/api-auth.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ PASS |
| **Purpose** | Actor extraction, role guards, `withAuthApi` wrapper |
| **Strengths** | Supports Bearer + cookies; test-mode path; role checks |
| **Issues** | Test auth path must never be reachable in production |
| **Recommendation** | Guard `isTestRequest` with explicit `NODE_ENV !== 'production'` |

#### `lib/calculator.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ EXCELLENT |
| **Purpose** | Single source of truth for all commercial math |
| **Strengths** | Pure function; commission/markup/hybrid; surge/rain/night; GST; coupons; driver share; platform profit |
| **Issues** | None |
| **Recommendation** | Keep pure; never duplicate formulas client-side |

#### `lib/commercial-engine.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG |
| **Purpose** | Contract / commission governance |
| **Strengths** | Aligns with Prisma `CommercialContract` |
| **Issues** | None major |
| **Recommendation** | — |

---

### 4.2 Dispatch & Geospatial

#### `lib/dispatch/atomic-lock.ts`
| Field | Detail |
|-------|--------|
| **Status** | ⚠️ PARTIAL |
| **Purpose** | Prevent double-assignment of drivers |
| **Strengths** | Local Map + Redis `SET NX PX`; `tryLockDriverOfferDistributed` exists |
| **Issues** | **Primary path is still memory-first** (`tryLockDriverForOffer`). Across pods, race conditions possible before Redis write |
| **Implementation Fix** | Make distributed lock the default: |

```ts
// Preferred call site
const locked = await tryLockDriverOfferDistributed(driverId, requestId, 15000)
if (!locked) continue // skip this candidate
```

Update all dispatch routes to use the async distributed API only.

#### `lib/dispatch/driver-tracker.ts`
| Field | Detail |
|-------|--------|
| **Status** | ⚠️ PARTIAL |
| **Purpose** | Live GPS index + H3 cell mapping + history buffer |
| **Strengths** | Coalescing (time + distance); history batch flush; Redis write of location JSON (`crave:driver:loc:{id}`) |
| **Issues** | **H3 inverted index (`cellToDriverMap`) is pure in-memory**. Reads (`getDriversInH3Cell`) never consult Redis. Multi-pod dispatch will miss drivers whose GPS landed on another pod |
| **Implementation Fix** | On update: |

```ts
// After local Map update
if (isRedisAvailable() && redis) {
  const pipe = redis.pipeline()
  pipe.set(`crave:driver:loc:${driverId}`, JSON.stringify(updatedState), 'EX', 120)
  if (cellChanged && previousCell) {
    pipe.srem(`crave:h3:cell:${previousCell}`, driverId)
  }
  pipe.sadd(`crave:h3:cell:${newH3Cell}`, driverId)
  pipe.expire(`crave:h3:cell:${newH3Cell}`, 180)
  await pipe.exec().catch(() => {})
}
```

Add distributed read path that falls back to Redis `SMEMBERS` + `GET` pipeline when local cell is empty.

#### `lib/dispatch/h3-dispatch.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG (depends on tracker) |
| **Purpose** | k-ring expansion + ranking |
| **Strengths** | Correct H3 pattern; multi-factor score |
| **Issues** | Depends on local-only `getDriversInH3Cell` |
| **Recommendation** | Switch to distributed cell lookup once tracker is fixed |

#### `lib/h3-grid.ts`
| Field | Detail |
|-------|--------|
| **Status** | ✅ PASS |
| **Purpose** | H3 helpers |
| **Issues** | None |

---

### 4.3 Real-Time Engine

#### `ws-server.js`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG with notes |
| **Purpose** | Standalone WS server, multi-pod pub/sub |
| **Strengths** | Channel allowlist; payload schema validation; size limits; Redis pub/sub with msgId dedup; subscription sync; GPS coalescing; slow-consumer protection; `WS_INTERNAL_SECRET` required in production |
| **Issues** | 1. Uses `jsonwebtoken` while app uses `jose` → dual JWT stack 2. Ownership checks for channels are partially deferred 3. Dev mode allows unauthenticated upgrade |
| **Recommendation** | Standardize on `jose` (or document intentional difference); ensure production always requires token on upgrade |

---

### 4.4 Database

#### `prisma/schema.prisma`
| Field | Detail |
|-------|--------|
| **Status** | ✅ STRONG |
| **Purpose** | Full domain model |
| **Strengths** | Roles, commercial fields, order financial snapshots, DriverLocationHistory + H3 cell index, PaymentReview queue, good composite indexes |
| **Issues** | Several financial / location fields still nullable; no soft-delete pattern |
| **Recommendation** | Progressive non-null hardening after data backfill |

---

### 4.5 Docker & Deployment

#### `Dockerfile`
| Field | Detail |
|-------|--------|
| **Status** | ⚠️ ISSUE |
| **Issues** | Hardcoded build-time: `ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crave?schema=public"` |
| **Risk** | Accidental reliance on placeholder credentials; pollutes image metadata |
| **Fix** | Use build-arg only for `prisma generate` dummy URL, never bake real/default credentials into layers |

#### `docker-compose.yml`
| Field | Detail |
|-------|--------|
| **Status** | ✅ PASS |
| **Strengths** | Redis 7 + AOF; healthchecks; internal WS port; env_file injection |
| **Issues** | PostgreSQL service not in compose (external assumed) — document clearly |

#### `.env.example`
| Field | Detail |
|-------|--------|
| **Status** | ✅ PASS |
| **Contains** | `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL` |
| **Recommendation** | Also document `WS_INTERNAL_SECRET` |

---

### 4.6 Frontend Portals & APIs (Summary)

| Path | Status | Notes |
|------|--------|-------|
| `app/user/*` | ✅ | Dual storefront, tracking, dual invoice PDF |
| `app/vendor/*` | ✅ | Kitchen desk, inventory, WS |
| `app/driver/*` | ✅ | Duty, H3 radar, OTP, wallet |
| `app/admin/*` | ✅ | Analytics, H3 map, UTR queue, settlements |
| `app/api/calculator` | ✅ EXCELLENT | Single pricing source |
| `app/api/dispatch/*` | ⚠️ | Must call distributed lock |
| `app/api/auth/*` | ✅ | Should call `blacklistToken` on logout |
| `app/api/orders/*` | ✅ | Broadcasts on mutation |
| `app/api/admin/*` | ✅ | Role-gated; some `any` casts in latest commit |

---

### 4.7 Testing

| Path | Status | Notes |
|------|--------|-------|
| `test/` | ✅ STRONG | JWT, rate-limit, dispatch, redis, calculator, WS, components |
| Claimed | 50 suites / 275 green | Keep CI as single source of truth |

---

## 5. Consolidated Issue Register

| ID | Severity | File(s) | Issue | Recommended Implementation |
|----|----------|---------|-------|----------------------------|
| **ISSUE-001** | **High** | `lib/dispatch/driver-tracker.ts` | H3 cell index is in-memory only; multi-pod dispatch incomplete | Write/read H3 sets in Redis (`SADD`/`SREM`/`SMEMBERS`) + location GET pipeline |
| **ISSUE-002** | **High** | `lib/dispatch/atomic-lock.ts` + dispatch routes | Lock is local-first; race across pods | Make `tryLockDriverOfferDistributed` the only production path |
| **ISSUE-003** | **Medium** | `ws-server.js` vs `lib/jwt.ts` | Dual JWT libraries (`jsonwebtoken` vs `jose`) | Standardize on `jose` in WS or document shared secret + algorithm contract |
| **ISSUE-004** | **Medium** | `Dockerfile` | Hardcoded `DATABASE_URL` at build | Use ARG dummy URL for generate only; do not bake into final image |
| **ISSUE-005** | **Medium** | Application layer | No general cache for menus / restaurants / payment-config | Add `lib/cache.ts` + read-through cache with short TTL + write invalidation |
| **ISSUE-006** | **Medium** | Coupon paths | Concurrent limited-coupon oversell possible | Redis `INCR` guard before DB write |
| **ISSUE-007** | **Low** | `lib/jwt.ts` | Hardcoded non-prod fallback secret | Remove or gate strictly behind local-only checks |
| **ISSUE-008** | **Low** | `lib/api-auth.ts` | Test auth path | Ensure impossible in production |
| **ISSUE-009** | **Low** | Admin API routes (latest commit) | Introduction of `any` casts | Restore proper Prisma types |
| **ISSUE-010** | **Info** | `docker-compose.yml` | Postgres external | Document required external DB topology |
| **ISSUE-011** | **Info** | CSRF | No explicit CSRF tokens on cookie-auth mutations | Evaluate SameSite=Lax sufficiency or add tokens for state-changing forms |

**Resolved since earlier audits:**
- JWT blacklist (`lib/jwt.ts`) — **FIXED**
- Rate limiting distributed — **PRESENT**
- WS multi-pod pub/sub — **PRESENT**
- Location write to Redis — **PRESENT**

---

## 6. Redis Implementation Status

| Capability | Status | Keys / Pattern |
|------------|--------|----------------|
| Client + fallback | ✅ | `lib/redis.ts` |
| Rate limit | ✅ | `crave:ratelimit:{tier}:{key}` |
| JWT blacklist | ✅ | `crave:jwt:blacklist:{jti}`, `crave:jwt:blacklist:user:{id}` |
| Driver location write | ✅ | `crave:driver:loc:{driverId}` |
| Driver location read | ⚠️ Partial | Local Maps primary |
| H3 cell index | ❌ Missing | Should be `crave:h3:cell:{h3Cell}` SET |
| Atomic lock | ⚠️ Partial | `crave:lock:driver:{driverId}` (not primary path) |
| WS pub/sub | ✅ | `crave:ws:events`, `crave:ws:subscriptions` |
| App cache (menus etc.) | ❌ Missing | — |
| Coupon counters | ❌ Missing | — |

---

## 7. Priority Remediation Roadmap

### P0 — Horizontal Scale Blockers
1. **Distributed H3 index** in `driver-tracker.ts`  
2. **Redis-primary locks** in dispatch flow  

### P1 — Security & Correctness
3. Standardize JWT library  
4. Remove Dockerfile baked `DATABASE_URL`  
5. Coupon atomic counters  
6. Ensure logout calls `blacklistToken`  

### P2 — Performance & Polish
7. `lib/cache.ts` for hot reads  
8. Remove `any` regressions  
9. CSRF evaluation  
10. Document Postgres topology  

---

## 8. Positive Highlights (Keep These)

- Single source of truth for money (`lib/calculator.ts`)
- JWT blacklist with JTI + user-level revoke
- Rate-limit tiers with Redis + memory fallback
- WS channel allowlist + payload validation + size limits
- Atomic lock primitive exists (needs to become default)
- Dual tax invoice PDF engine
- Uber H3 dispatch design (correct pattern)
- Excellent documentation density
- Docker healthchecks and internal WS port
- Strong test suite structure

---

## 9. Final Verdict

| Question | Answer |
|----------|--------|
| Production-ready (single node)? | **Yes** |
| Production-ready (multi-pod app + dispatch)? | **Not yet** — fix ISSUE-001 & ISSUE-002 first |
| Security baseline acceptable? | **Yes**, with medium follow-ups |
| Commercial engine trustworthy? | **Yes** |
| Real-time engine solid? | **Yes** |
| Next score target after P0+P1 | **90–92 / 100** |

---

**End of Full Platform Audit**  
Generated from live repository inspection of architecture, security paths, Redis usage, dispatch layer, WebSocket server, Prisma schema, Docker configuration, JWT/auth modules, calculator, and test surface.
```

---

You can save the content above directly as:

```bash
docs/CRAVE_FULL_PLATFORM_AUDIT.md
```

It includes:
- Full scorecard (all dimensions /100)
- System topology
- **File-by-file** status with path, issues, and implementation guidance
- Consolidated issue register (ISSUE-001 … ISSUE-011) with severity and fix direction
- Redis capability matrix
- Priority roadmap
- What is already strong / recently fixed