# CRAVE — Deployment, Database Operations & Disaster Recovery Guide

**Date:** October 2026  
**Auditor:** Principal SRE & Database Architect  
**Classification:** Site Reliability Engineering & Operations  
**Scope:** Production Deployment, Environment Variables, Prisma Migrations, Connection Pooling, Health Checks, and Incident Runbooks

---

## 1. Environment Configuration

The application requires specific environment variables for production security and operation. Sensitive credentials must be injected via secure secrets managers (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) and never committed to source control.

### 1.1 Critical Environment Variables

| Variable          | Classification | Description                                                                              | Default / Example                                              |
| :---------------- | :------------- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `NODE_ENV`        | Runtime        | Must be `production`. When set to `production`, all test auth backdoors are locked down. | `production`                                                   |
| `DATABASE_URL`    | Secret         | PostgreSQL connection string with SSL enabled in production.                             | `postgresql://user:pass@pg-primary:5432/crave?sslmode=require` |
| `JWT_SECRET`      | Secret         | High-entropy cryptographic secret for HMAC-SHA256 token signing (min 64 chars).          | `[REDACTED_HIGH_ENTROPY_KEY]`                                  |
| `NEXTAUTH_SECRET` | Secret         | Required for session token encryption.                                                   | `[REDACTED_HIGH_ENTROPY_KEY]`                                  |
| `WS_URL`          | Public / Net   | WebSocket service URI for browser and client push connections.                           | `wss://ws.crave.app`                                           |
| `PORT`            | Runtime        | Port for Next.js HTTP server.                                                            | `3000`                                                         |
| `WS_PORT`         | Runtime        | Port for WebSocket cluster server.                                                       | `8080`                                                         |
| `REDIS_URL`       | Optional       | Shared state cache and distributed rate limiting backend.                                | `redis://redis:6379`                                           |

---

## 2. Database Migration & Schema Management

### 2.1 Principle of Safe Migrations

- **Never Run `prisma db push` in Production:** `db push` can cause silent schema drifts, unindexed columns, and accidental data loss during schema conflicts.
- **Mandatory Migration Workflow:**
  1. Generate migrations locally/staging:
     ```bash
     npx prisma migrate dev --name <descriptive_name>
     ```
  2. Inspect the generated SQL in `prisma/migrations/<timestamp>_<descriptive_name>/migration.sql` to verify safety (no table drops, non-null additions without defaults, or unindexed foreign keys).
  3. Apply in production via CI/CD before rolling out code containers:
     ```bash
     npx prisma migrate deploy
     ```

### 2.2 Connection Pool Hardening

As configured in `lib/prisma.ts`:

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size per node
  idleTimeoutMillis: 30000, // Reclaim idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout fast on database saturation
})
```

_Note on Serverless / PgBouncer:_ When deploying to Vercel or AWS Lambda with multiple instances, route queries through PgBouncer or Supabase connection pooling (port 6543, transaction pooling mode).

---

## 3. Backup and Restoration Procedure

### 3.1 Automated Backup Cadence

- **Continuous WAL Archiving:** Point-in-time recovery (PITR) enabled up to 7 days.
- **Daily Full Logical Snapshot:** Executed via `pg_dump` during off-peak hours (03:00 UTC).
  ```bash
  pg_dump -Fc --no-acl --no-owner -h $PG_HOST -U $PG_USER -d crave > crave_backup_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Offsite Replication:** Encrypted snapshots mirrored to geographically redundant object storage.

### 3.2 Restoration Runbook

1. Provision target clean PostgreSQL instance.
2. Terminate all active application connections to avoid write contamination.
3. Execute `pg_restore`:
   ```bash
   pg_restore -v --clean --no-acl --no-owner -h $NEW_PG_HOST -U $PG_USER -d crave < backup_file.dump
   ```
4. Verify record counts and run integrity sanity checks:
   ```sql
   SELECT count(*) FROM "Order";
   SELECT count(*) FROM "User";
   ```
5. Update DNS or `DATABASE_URL` and perform canary application boot.

---

## 4. Health Checks & Failure Recovery

### 4.1 Endpoint Health Probes

- **HTTP Liveness Probe:** `GET /api/health`
  - Returns `200 OK` if Next.js process is responsive.
- **HTTP Readiness Probe:** `GET /api/health/ready`
  - Pings PostgreSQL (`SELECT 1`) and verifies database connectivity. Fails with `503 Service Unavailable` if database is unresponsive.
- **WebSocket Health Probe:** `GET /health` on port 8080.
  - Returns connection count, uptime, and memory usage.

### 4.2 Failure Recovery Matrices

| Incident                        | Detection                                         | Immediate Action                                                                   | Recovery Step                                                                                                         |
| :------------------------------ | :------------------------------------------------ | :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Database Pool Exhaustion**    | 500 errors on API, `Connection terminated` logs   | Scale down idle web pods; inspect long-running transactions via `pg_stat_activity` | Kill stuck queries, increase connection pool limits via PgBouncer                                                     |
| **WebSocket Server Crash**      | Client reconnect loops, missing order live events | Container orchestrator auto-restarts `ws-server.js`                                | Client hooks (`useWebSocket`) automatically backoff-reconnect and re-sync authoritative state from `/api/orders/[id]` |
| **Payment Verification Lockup** | Spike in `PENDING` orders, customer dispute logs  | Query `PaymentReview` table for blocked UTR records                                | Admin operators verify unconfirmed UTRs via `/admin/payment-reviews`                                                  |

---

## 5. Safe Rollback Procedure

If a deployed release introduces operational defects:

1. **Application Code Rollback:** Roll back Kubernetes deployment or Vercel production alias to the prior immutable commit hash.
2. **Backward-Compatible Schemas:** All database migrations must adhere to the **Expand-and-Contract** pattern:
   - Add new columns as optional/nullable.
   - Never remove or rename columns in the same release as application code changes.
   - Decommission old columns only in a subsequent release after older code versions have ceased traffic.
3. **Verification Checklist:**
   - Execute synthetic cart checkout test.
   - Verify WebSocket real-time subscription handshake.
   - Review Sentry / CloudWatch error logs for unexpected spikes.
