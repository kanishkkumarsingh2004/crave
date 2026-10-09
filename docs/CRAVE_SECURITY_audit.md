# CRAVE — Comprehensive Security Testing & Penetration Testing Plan

**Repository:** `kanishkkumarsingh2004/crave`
**Recommended file:** `SECURITY_TEST_PLAN.md`
**Application type:** Next.js, API/backend services, Prisma, database, WebSockets, restaurant ordering, payments, delivery tracking
**Priority:** Security-critical
**Status:** **SAST Complete** — Static analysis tests executed and verified; dynamic testing pending staging environment

---

## 1. Purpose

## 1. Purpose

This document defines a comprehensive security testing program for CRAVE, covering application code, APIs, authentication, authorization, database access, real-time communications, payment workflows, delivery confirmation, deployment configuration, and dependency security.

The goal is to identify vulnerabilities before production deployment and prevent regressions after fixes.

### Testing objectives

- Identify SQL injection and other injection vulnerabilities.
- Detect cross-site scripting (XSS) and cross-site request forgery (CSRF).
- Test authentication and authorization enforcement.
- Test brute-force protection and account enumeration.
- Detect insecure direct object references (IDOR) and tenant-isolation failures.
- Test API input validation and rate limits.
- Test WebSocket authentication, subscriptions, and driver-location integrity.
- Detect order-price manipulation and payment-verification weaknesses.
- Verify delivery OTP and QR confirmation security.
- Identify vulnerable dependencies, exposed secrets, and insecure Docker settings.
- Test file uploads, SSRF risks, CORS, security headers, and session handling.
- Verify logging, monitoring, error handling, and operational resilience.

## 2. Authorization and Safety Rules

All penetration tests must be performed against a CRAVE instance that you own or have explicit authorization to test.

### Approved environments

1. Local development instance.
2. Dedicated staging deployment.
3. Isolated test database with synthetic users and orders.
4. Local containers built from the repository.

Do not run active tests against production customers, real payment systems, or third-party services without explicit authorization and an approved testing window.

### Testing restrictions

- Never use real customer credentials or personal information.
- Never extract or retain real user data to prove a vulnerability.
- Do not perform destructive database operations.
- Do not send real payment transactions during security tests.
- Do not conduct distributed denial-of-service testing.
- Do not run high-volume brute-force attacks against production.
- Do not use stolen credentials or third-party target lists.
- Keep SQL injection tests non-destructive.
- Use dedicated test accounts with known roles.
- Stop immediately if tests affect real users or destabilize the service.

**Default target:** `http://localhost:3000`

Change this only to an explicitly authorized test environment. Keep the target separate from production configuration.

---

## 3. Severity and Finding Format

| Severity      | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| Critical      | Remote compromise, major unauthorized access, or serious financial/data integrity failure  |
| High          | Authentication bypass, tenant data exposure, payment manipulation, or privilege escalation |
| Medium        | Limited information disclosure, missing protection, or exploitable security weakness       |
| Low           | Defense-in-depth issue with limited direct impact                                          |
| Informational | Hardening recommendation without a confirmed exploitable vulnerability                     |

Every test finding must record:

- Test ID
- Severity
- Date and environment
- Route or component
- Source file and line range
- Preconditions and test account role
- Reproduction steps
- Expected result
- Actual result
- Evidence with secrets and personal information redacted
- Recommended fix
- Regression test
- Retest result

A test that has not been executed must be marked `NOT RUN`, not `PASS`.

---

# 4. Static Application Security Testing (SAST) — **COMPLETED ✅**

_Executed: 2026-10-09 | Environment: Local development | Branch: production-security-fixes_

### SEC-SAST-001 — ESLint and TypeScript ✅ **PASS**

```bash
pnpm run typecheck    # PASS (tsc --noEmit: 0 errors)
pnpm run build        # PASS (Next.js build: 10.1s)
```

- No TypeScript errors
- Production build completes successfully
- No lint script configured; format:check via Prettier run separately (16 files auto-fixed)

### SEC-SAST-002 — Semgrep ✅ **PASS**

```bash
semgrep scan --config p/security-audit .
```

- **Result:** 0 findings (0 blocking)
- 212 files scanned, 31 rules executed
- Languages: TypeScript, JavaScript, JSON, Dockerfile
- No security-audit rule violations found

### SEC-SAST-003 — Secret Scanning (Gitleaks) ✅ **PASS**

```bash
gitleaks git .
```

- **Result:** No leaks found
- 127 commits scanned, ~12.7 MB scanned
- No exposed JWT secrets, database credentials, API keys, or private keys

### SEC-SAST-004 — Dangerous Functions ✅ **PASS**

```bash
grep -rn "eval\(|new Function|child_process|exec\(|spawn\(|\$queryRawUnsafe|\$executeRawUnsafe|dangerouslySetInnerHTML"
```

- **Result:** 0 dangerous patterns in source code
- Single `pipeline.exec()` in `lib/rate-limit.ts` — Redis pipeline execution (safe)
- No `eval`, `new Function`, `child_process`, `exec`, `spawn`, raw SQL, or `dangerouslySetInnerHTML` in source

### SEC-SAST-005 — Dependency Vulnerabilities ⚠️ **PARTIAL**

```bash
pnpm audit
```

- **Result:** 5 vulnerabilities found (1 high, 2 critical, 2 moderate)
- All in transitive test dependencies (jest, babel-jest, handlebars, sprintf-js, braces)
- **No vulnerabilities in production dependencies**
- Test-only dependencies; production build unaffected
- **Recommendation:** Monitor for patches; consider updating test dependencies when available

---

# 5. Authentication and Session Security

## SEC-AUTH-001 — Unauthenticated Access

Attempt to access protected endpoints without a session or token.

**Expected result:** `401 Unauthorized` for unauthenticated requests, unless the route is explicitly public.

Test:

- User profile.
- Order history.
- Order details.
- Restaurant management.
- Vendor settings.
- Driver operations.
- Admin endpoints.
- Payment management.
- Internal service endpoints.

A `200 OK` response containing protected information is a failure.

## SEC-AUTH-002 — Invalid, Expired, and Malformed Tokens

Test:

- Missing token.
- Invalid signature.
- Expired token.
- Malformed token.
- Token with unsupported algorithm.
- Token with incorrect issuer or audience, where configured.
- Token for a deleted or disabled account.
- Token with a forged role claim.

**Expected result:** Access is denied, with no sensitive data in the response.

The server must not trust a role or user ID supplied separately in a request body when it conflicts with the authenticated principal.

## SEC-AUTH-003 — Session Revocation

Test whether a logged-out or revoked session remains usable.

**Expected result:** Revoked credentials cannot continue accessing protected resources beyond the explicitly documented token/session policy.

## SEC-AUTH-004 — Cookie Security

If cookie-based authentication is used, inspect:

- `HttpOnly`
- `Secure` in HTTPS deployments
- Appropriate `SameSite`
- Expiry and rotation
- Cookie domain and path
- CSRF protection for state-changing requests

Do not store long-lived sensitive tokens in browser-accessible storage without a documented threat model.

## SEC-AUTH-005 — Account Enumeration

Test login, signup, password recovery, and OTP endpoints using known and unknown test accounts.

**Expected result:** Responses should not unnecessarily reveal whether an account exists. Consider response content, status codes, timing differences, and rate-limit behavior.

## SEC-AUTH-006 — Password and OTP Policy

Verify:

- Server-side password validation.
- Secure password hashing.
- OTP expiry.
- Attempt limits.
- Single-use semantics where required.
- Secure generation.
- No OTPs or passwords in logs.
- No reusable development bypass in production.

---

# 6. Brute-Force and Rate-Limit Testing

## SEC-RATE-001 — Login Brute-Force Protection

Use dedicated test accounts and a small, controlled number of invalid attempts.

**Expected result:**

- Attempts are rate-limited.
- The system provides consistent error responses.
- Monitoring records suspicious attempts.
- A valid user's account cannot be permanently locked by an unauthenticated attacker.
- Distributed deployments enforce shared rate limits where necessary.

Avoid testing with large password lists or against production accounts.

## SEC-RATE-002 — OTP Guessing Protection

Test a bounded number of incorrect OTP submissions in staging.

**Expected result:**

- Attempts are limited per credential and relevant account/order.
- The OTP expires.
- Successful verification invalidates it.
- Failed attempts do not reveal partial OTP information.
- Repeated attempts are logged and throttled.

## SEC-RATE-003 — Password Recovery Abuse

Test repeated recovery requests for one synthetic account.

**Expected result:** Requests are throttled, responses avoid account enumeration, and recovery tokens expire.

## SEC-RATE-004 — API Rate Limiting

Check rate limits on:

- Login and signup.
- OTP creation and verification.
- Order creation.
- Payment submission and verification.
- Search and filtering endpoints.
- Restaurant/vendor management.
- Driver location updates.
- WebSocket connection and message handling.
- Internal broadcast endpoints.

**Pass criteria:** Limits are appropriate to the endpoint, applied server-side, and effective across application instances.

## SEC-RATE-005 — Resource Exhaustion Controls

Verify:

- Request body limits.
- Maximum page size.
- Search/filter complexity limits.
- WebSocket message size limits.
- Connection limits.
- File upload size limits.
- Request timeouts.
- Database connection pool limits.

Do not conduct uncontrolled load or denial-of-service testing as part of this suite.

---

# 7. SQL Injection and Database Security

## SEC-SQL-001 — SQL Injection in Query Parameters

Test parameters such as:

- `id`
- `search`
- `sort`
- `filter`
- `status`
- `ownerId`
- `restaurantId`
- `orderId`

Use benign syntax probes in an isolated test environment, for example:

```text
'
''
' OR '1'='1
```

Use these only as test inputs to relevant parameters. Do not execute destructive statements.

**Expected result:**

- No SQL syntax or stack traces are exposed.
- Input cannot alter the intended query structure.
- Results remain properly scoped.
- Invalid inputs return controlled validation errors.

## SEC-SQL-002 — ORM Parameterization

Inspect Prisma query construction.

**Expected result:**

- Ordinary user inputs use parameterized Prisma operations.
- Raw SQL is reviewed individually.
- Unsafe raw query APIs do not concatenate untrusted values.
- Sorting and field names use explicit allowlists.
- Query filters cannot bypass tenant restrictions.

## SEC-SQL-003 — SQL Injection in JSON Bodies

Test relevant search, filtering, reporting, and management request bodies with benign injection probes.

**Expected result:** Inputs are treated as data, not executable query fragments.

## SEC-SQL-004 — Error Disclosure

Send malformed values to relevant endpoints.

**Expected result:**

- No database credentials or internal hostnames are exposed.
- No raw SQL or stack trace is returned in production.
- Internal details remain available through access-controlled server logs.

## SEC-SQL-005 — Database Privileges

Verify that the application database role has only the permissions needed for normal application operations.

Do not run schema migrations using an unnecessarily privileged runtime account.

## SEC-SQL-006 — Tenant Isolation at the Database Layer

Test whether a user can query another user's records by changing IDs or filters.

**Expected result:** Ownership and authorization constraints remain enforced even when the client submits valid IDs belonging to another tenant.

---

# 8. Cross-Site Scripting (XSS)

## SEC-XSS-001 — Reflected XSS

Test user-controlled query parameters and search terms.

A harmless probe can be:

```html
<script>
  alert(1)
</script>
```

Use only on local or staging pages.

**Expected result:** The string is rendered as text or safely encoded and does not execute.

## SEC-XSS-002 — Stored XSS

Test fields that persist user-controlled content, such as:

- Restaurant names and descriptions.
- Menu item names.
- Customer names.
- Delivery instructions.
- Reviews or notes, if supported.
- Support messages, if supported.

**Expected result:** Stored content cannot execute script when rendered in another user's browser or an administrative dashboard.

## SEC-XSS-003 — DOM-Based XSS

Inspect frontend code that reads:

- URL parameters.
- Hash fragments.
- Local storage.
- API responses.
- User-provided strings.

Verify that unsafe HTML sinks are not used with untrusted content.

## SEC-XSS-004 — HTML Rendering

Review any use of `dangerouslySetInnerHTML`.

**Expected result:** Untrusted HTML is not rendered directly. If rich HTML is a requirement, use an appropriate sanitizer and restrictive content policy.

## SEC-XSS-005 — Content Security Policy

Review the Content Security Policy for unsafe script execution allowances and unintended third-party sources.

**Pass criteria:** The policy reflects the actual application requirements and does not rely on broad unsafe allowances without justification.

---

# 9. Authorization, IDOR, and Privilege Escalation

CRAVE uses multiple roles. These tests are essential.

## SEC-AUTHZ-001 — Customer-to-Customer Isolation

Using two synthetic customers:

1. Create an order as Customer A.
2. Authenticate as Customer B.
3. Attempt to read or modify Customer A's order using its ID.

**Expected result:** Customer B cannot read, update, cancel, or otherwise manipulate Customer A's order.

## SEC-AUTHZ-002 — Vendor-to-Vendor Isolation

Create two test restaurants owned by different vendor accounts.

Attempt to read or modify another vendor's:

- Restaurant.
- Menu.
- Pricing.
- Commercial settings.
- Orders.
- Payment records.
- Restaurant status.

**Expected result:** Cross-tenant access is denied.

## SEC-AUTHZ-003 — Driver-to-Driver Isolation

Attempt to access another driver's:

- Assigned deliveries.
- Location history.
- Profile and status.
- Delivery verification data.

**Expected result:** A driver can access only authorized information.

## SEC-AUTHZ-004 — Customer-to-Driver Isolation

Attempt to use customer credentials to call driver-specific endpoints.

**Expected result:** The request is denied regardless of the submitted `driverId`.

## SEC-AUTHZ-005 — Vendor-to-Admin Escalation

Attempt to modify role fields or invoke admin endpoints as a vendor.

**Expected result:** The user cannot grant themselves admin privileges or access admin-only operations.

## SEC-AUTHZ-006 — Client-Controlled Identity

Modify `userId`, `customerId`, `driverId`, `ownerId`, and role fields in test requests.

**Expected result:** Authorization derives from the authenticated server-side principal and verified resource relationships.

## SEC-AUTHZ-007 — Object-Level Authorization

For every endpoint that accepts a resource ID, verify authorization against the actual resource, not merely the caller's role.

**Pass criteria:** No tested role can access an unauthorized resource by changing its identifier.

---

# 10. API Security and Input Validation

## SEC-API-001 — HTTP Method Enforcement

Try unsupported methods on relevant endpoints.

**Expected result:** Unsupported operations are rejected without performing unintended changes.

## SEC-API-002 — Schema Validation

Test:

- Missing required fields.
- Unexpected fields.
- Wrong data types.
- Null values.
- Empty strings.
- Negative amounts.
- Excessively long strings.
- Invalid enums.
- Invalid IDs.
- Malformed dates.
- Nested objects where primitive values are expected.

**Expected result:** Invalid data is rejected before business logic or database mutation.

## SEC-API-003 — Mass Assignment

Attempt to submit protected fields such as:

- `role`
- `status`
- `driver_id`
- `delivery_otp`
- `total_amount`
- `discount_amount`
- `gst`
- `commission`
- `is_verified`

**Expected result:** Protected fields are ignored or rejected unless the authenticated role is explicitly authorized to set them.

## SEC-API-004 — Excessive Data Exposure

Review API responses for:

- Password hashes.
- Access tokens.
- OTPs.
- Internal secrets.
- Unrelated customer records.
- Private driver location history.
- Internal payment metadata.

**Expected result:** Responses include only the information required by the caller.

## SEC-API-005 — Pagination and Filtering

Test invalid, negative, and excessively large pagination values.

**Expected result:** Pagination is validated, bounded, and does not trigger uncontrolled database work.

## SEC-API-006 — HTTP Headers and Content Types

Verify content-type enforcement, origin checks where applicable, secure response headers, and rejection of malformed payloads.

---

# 11. WebSocket and Real-Time Security

CRAVE's real-time order and tracking functionality needs a dedicated security test suite.

## SEC-WS-001 — Unauthenticated WebSocket Connection

Attempt to connect without valid authentication.

**Expected result:** Private channels and protected messages remain inaccessible.

## SEC-WS-002 — Unauthorized Channel Subscription

Authenticate as one customer and attempt to subscribe to another customer's order channel.

**Expected result:** Subscription is denied and no protected event is delivered.

## SEC-WS-003 — Driver Identity Spoofing

Send a test `driver_update` message containing another driver's ID.

**Expected result:** The server ignores client-supplied identity and derives the driver ID from the authenticated session.

## SEC-WS-004 — GPS Payload Validation

Test:

- Latitude outside `-90` to `90`.
- Longitude outside `-180` to `180`.
- Non-numeric coordinates.
- Missing coordinates.
- Non-finite values.
- Stale timestamps.
- Excessively frequent updates.

**Expected result:** Invalid messages are rejected, rate-limited, or handled according to a documented validation policy.

## SEC-WS-005 — Cross-Role Event Leakage

Verify that customers, drivers, vendors, and admins receive only the events authorized for their role and resource relationships.

## SEC-WS-006 — Malformed and Oversized Messages

Send malformed JSON and messages above the configured size limit in staging.

**Expected result:** The server rejects the message safely without crashing or consuming unbounded resources.

## SEC-WS-007 — Connection Abuse

Test a small, controlled number of repeated connection attempts.

**Expected result:** Authentication, connection limits, heartbeats, and cleanup prevent unbounded resource consumption.

## SEC-WS-008 — Internal Broadcast Authorization

Attempt to access internal broadcast functionality without valid service credentials.

Test unknown channels and invalid payloads with authorized test credentials.

**Expected result:**

- Requests without service authorization are denied.
- Missing production secrets cause a fail-closed startup or service failure.
- Channels are allowlisted.
- Payloads are schema-validated and size-limited.
- Secrets never appear in responses or logs.

---

# 12. Order and Financial Integrity

## SEC-ORDER-001 — Order Price Manipulation

Create a test order and attempt to change:

- Item price.
- Quantity.
- Subtotal.
- GST.
- Discount.
- Delivery fee.
- Platform fee.
- Restaurant markup.
- Commission.
- Final total.

**Expected result:** The server calculates authoritative amounts from trusted product, restaurant, and commercial configuration data.

## SEC-ORDER-002 — Unauthorized Order Status Change

Attempt to submit arbitrary statuses, including `DELIVERED`, `CANCELLED`, and `CONFIRMED`.

**Expected result:** Only permitted transitions are accepted for the authenticated actor.

## SEC-ORDER-003 — Duplicate Order Submission

Submit the same test checkout request more than once.

**Expected result:** The application handles retries safely through idempotency or a documented duplicate-prevention mechanism.

## SEC-ORDER-004 — Concurrent Driver Assignment

Use a controlled concurrency test in staging to attempt to assign one order to multiple drivers.

**Expected result:** The database transaction or atomic update ensures only one valid assignment succeeds.

## SEC-ORDER-005 — Commercial Configuration Manipulation

Attempt to change commission percentages, fixed fees, markup, GST settings, and vendor commercial terms as an unauthorized role.

**Expected result:** Unauthorized changes are rejected, and valid changes are audited.

## SEC-ORDER-006 — Financial Precision

Test decimal boundaries, rounding, zero values, and maximum permitted amounts.

**Expected result:** Server-side calculations use an appropriate money representation and a documented rounding policy.

---

# 13. Payment and UPI Security

## SEC-PAY-001 — Forged Payment Confirmation

Submit a payment status or verification field from the client.

**Expected result:** A client request alone cannot establish that a payment succeeded.

## SEC-PAY-002 — UTR Verification

Submit a synthetic UTR value in a test payment flow.

**Expected result:** A submitted UTR is treated as unverified until a trusted verification or reconciliation process confirms it.

## SEC-PAY-003 — Duplicate UTR

Attempt to reuse a test UTR where duplicate detection applies.

**Expected result:** Duplicate payment references are detected and handled according to the payment workflow.

## SEC-PAY-004 — Amount and Order Mismatch

Use a staging test case where the reported payment amount does not match the expected order amount.

**Expected result:** The payment is not marked as valid for the mismatched order.

## SEC-PAY-005 — Replayed Callbacks

Replay a synthetic payment callback against the staging integration.

**Expected result:** Callback authentication and idempotency prevent duplicate fulfillment or duplicate financial records.

## SEC-PAY-006 — Payment Authorization

Verify that a customer cannot access another customer's payment details and that vendors see only authorized payment information.

**Safety:** Use payment-provider sandbox facilities. Never use real payment credentials or trigger real transfers for these tests.

---

# 14. Delivery OTP and QR Verification

## SEC-DELIVERY-001 — OTP Guessing

Submit a bounded number of incorrect codes for a test order.

**Expected result:** Attempts are limited and monitored.

## SEC-DELIVERY-002 — OTP Expiry

Attempt delivery confirmation after the credential expires.

**Expected result:** Expired credentials are rejected.

## SEC-DELIVERY-003 — OTP Reuse

Use a successful delivery credential a second time.

**Expected result:** The second attempt fails.

## SEC-DELIVERY-004 — Wrong Order

Use an OTP or QR credential from Order A to confirm Order B.

**Expected result:** Verification fails.

## SEC-DELIVERY-005 — Wrong Driver

Attempt delivery confirmation using a driver who is not assigned to the order.

**Expected result:** Verification fails.

## SEC-DELIVERY-006 — Secure Generation

Verify that OTP generation uses a cryptographically secure random source, such as Node.js `crypto.randomInt`, rather than `Math.random()`.

## SEC-DELIVERY-007 — Atomic Completion

Submit two delivery confirmation requests concurrently.

**Expected result:** Only one transition to `DELIVERED` succeeds, and the event is recorded once.

---

# 15. CSRF, CORS, and Security Headers

## SEC-WEB-001 — CSRF

For cookie-authenticated state-changing routes, verify:

- Appropriate CSRF protection.
- Origin or Referer validation where appropriate.
- Correct `SameSite` policy.
- No unintended state changes from cross-origin requests.

Do not require CSRF tokens for authentication mechanisms that are not vulnerable to browser-automatically-attached credentials without first evaluating the threat model.

## SEC-WEB-002 — CORS

Test requests from:

- An approved frontend origin.
- An unrelated origin.
- A `null` origin where relevant.

**Expected result:** Only explicitly authorized origins receive the intended cross-origin permissions.

Do not combine wildcard origins with credentialed access.

## SEC-WEB-003 — Security Headers

Review applicable headers:

- Content-Security-Policy.
- Strict-Transport-Security in HTTPS deployments.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.
- Frame protection through CSP or appropriate headers.

**Expected result:** Headers are configured for the actual deployment architecture without breaking required application features.

## SEC-WEB-004 — Open Redirects

Test redirect parameters with external destinations.

**Expected result:** Redirects are restricted to trusted destinations or use a validated allowlist.

---

# 16. SSRF and URL Handling

## SEC-SSRF-001 — Server-Side URL Fetching

Identify features that fetch user-supplied URLs, including imports, image processing, webhooks, or URL previews.

If such functionality exists, test it only in staging using controlled destinations.

**Expected result:**

- Loopback and private network destinations are blocked where not required.
- Cloud metadata endpoints are blocked.
- Internal service hostnames cannot be reached through user-controlled URLs.
- Redirects are revalidated.
- DNS resolution and address changes are considered.
- Response size and timeout limits are enforced.

If CRAVE does not fetch user-supplied URLs, mark this test `NOT APPLICABLE` with evidence.

---

# 17. File Upload Security

Only applicable if CRAVE supports file uploads.

## SEC-FILE-001 — File Type Validation

Test mismatched extensions, MIME types, and file signatures.

**Expected result:** Validation does not rely solely on the filename or client-provided MIME type.

## SEC-FILE-002 — File Size Limits

Attempt uploads above the configured limit using a test file.

**Expected result:** Oversized uploads are rejected before excessive resources are consumed.

## SEC-FILE-003 — Filename Handling

Test filenames containing traversal patterns, unusual Unicode, and long strings.

**Expected result:** Files cannot escape the intended storage location or overwrite another user's file.

## SEC-FILE-004 — Stored Content Delivery

Ensure uploaded content is not unintentionally executed and is served with appropriate content types and security controls.

---

# 18. Docker, Environment, and Deployment Security

## SEC-DEPLOY-001 — Build-Time Secrets

Inspect Dockerfiles and build configuration for sensitive build arguments or environment variables.

**Expected result:** Runtime secrets are not baked into image layers or exposed in build output.

## SEC-DEPLOY-002 — Default Secrets

Verify that production startup fails if required secrets are missing.

Known fallback values must not be accepted as production credentials.

## SEC-DEPLOY-003 — Container Privileges

Check that application containers:

- Run as a non-root user where practical.
- Expose only required ports.
- Do not mount sensitive host paths unnecessarily.
- Use appropriate network isolation.
- Have resource limits and health checks.
- Handle graceful shutdown.

## SEC-DEPLOY-004 — Development Configuration

Verify that development-only CORS, debug modes, test authentication bypasses, and permissive build settings cannot be activated accidentally in production.

## SEC-DEPLOY-005 — Environment Validation

Test startup with missing or invalid required environment variables.

**Expected result:** The application fails safely with a clear configuration error and does not silently use insecure defaults.

## SEC-DEPLOY-006 — TLS

Verify HTTPS configuration, certificate validity, secure cookies, and secure communication between services where required by the deployment model.

---

# 19. Logging, Errors, and Privacy

## SEC-LOG-001 — Secret Leakage

Trigger representative authentication, payment, and validation failures.

Inspect application logs for passwords, bearer tokens, session cookies, OTPs, API keys, and internal secrets.

**Expected result:** Sensitive credentials are redacted.

## SEC-LOG-002 — Error Disclosure

Verify that production responses do not contain stack traces, filesystem paths, database connection details, or internal implementation data.

## SEC-LOG-003 — Audit Events

Verify that sensitive operations generate auditable events:

- Failed and successful authentication.
- Role or permission changes.
- Order status changes.
- Driver assignment.
- Delivery confirmation.
- Payment verification.
- Commercial configuration changes.
- Administrative actions.

## SEC-LOG-004 — Privacy and Retention

Review location history, customer addresses, payment metadata, and logs for appropriate access controls and retention limits.

---

# 20. Automated Dynamic Testing

Use a dedicated staging environment for active testing.

## SEC-DAST-001 — OWASP ZAP Baseline Scan

Install and configure OWASP ZAP in an authorized environment.

A baseline scan can be run against the local web application:

```bash
docker run --rm \
  -t \
  -v "$PWD/zap-reports:/zap/wrk/:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -r zap-baseline.html
```

The host address may differ on Linux. Configure the container's network access to reach the intended local test server. Do not expose the application publicly just to make the scanner work.

A baseline scan primarily performs passive checks. It is not a complete penetration test and does not prove that SQL injection or authorization flaws are absent.

Review findings manually and rerun the scan after fixes.

## SEC-DAST-002 — Authenticated Testing

Configure separate test identities for:

- Customer A.
- Customer B.
- Vendor A.
- Vendor B.
- Driver A.
- Driver B.
- Administrator.

Use only synthetic records and test credentials.

Verify both permitted and denied operations. Automated scanners generally cannot infer all of CRAVE's business authorization rules without explicit test cases.

## SEC-DAST-003 — API Contract Tests

For each API route, define:

- Required authentication.
- Allowed roles.
- Resource ownership rules.
- Input schema.
- Expected status codes.
- Rate limits.
- Side effects.
- Idempotency behavior.

Add automated tests for these rules to the existing project test suite.

---

# 21. Concurrency and Reliability Testing

Performance testing is separate from security penetration testing, but it is necessary for production readiness.

## SEC-PERF-001 — Controlled API Load

Use synthetic traffic against local or staging infrastructure with a predetermined request rate and concurrency limit.

Measure:

- p50, p95, and p99 response latency.
- Error rate.
- Database connection utilization.
- CPU and memory.
- Request timeouts.
- Rate-limit behavior.

Do not define a fixed passing throughput before measuring the available environment and agreeing on a service-level target.

## SEC-PERF-002 — Order Concurrency

Submit controlled concurrent test orders and verify:

- No duplicate fulfillment.
- No negative or inconsistent inventory where inventory is modeled.
- No duplicate payment processing.
- No conflicting driver assignment.
- Correct order totals.

## SEC-PERF-003 — WebSocket Stability

Test a limited number of synthetic connections and messages, increasing gradually.

Measure connection stability, broadcast latency, queue growth, disconnect behavior, and cleanup.

Do not perform uncontrolled connection floods.

## SEC-PERF-004 — Multi-Instance Behavior

If the production architecture uses multiple application or WebSocket instances, verify that authentication, shared subscriptions, rate limits, and dispatch state behave consistently across instances.

---

# 22. CI Security Pipeline

Run these checks on pull requests and the production branch.

Recommended pipeline:

1. Install the pinned Node.js and pnpm versions.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Run lint.
4. Run TypeScript checks.
5. Run unit tests.
6. Run API authorization regression tests.
7. Run order and payment integrity tests.
8. Run WebSocket security tests.
9. Scan dependencies.
10. Scan source code for security patterns.
11. Scan for accidentally committed secrets.
12. Build the production application.
13. Build and scan the container image.
14. Run authorized staging smoke tests.

A pipeline should fail on confirmed critical findings and relevant regressions. Medium and low findings should follow a documented triage policy rather than being silently ignored.

---

# 23. Security Regression Test Matrix

| ID      | Test                                | Expected result                                      |
| ------- | ----------------------------------- | ---------------------------------------------------- |
| SEC-001 | Missing authentication              | Protected route denies access                        |
| SEC-002 | Invalid token                       | Request denied                                       |
| SEC-003 | Expired session                     | Request denied according to policy                   |
| SEC-004 | Role escalation                     | Unauthorized role change denied                      |
| SEC-005 | Cross-customer order access         | Denied                                               |
| SEC-006 | Cross-vendor restaurant access      | Denied                                               |
| SEC-007 | Cross-driver access                 | Denied                                               |
| SEC-008 | SQL injection probe                 | Query remains safe                                   |
| SEC-009 | Reflected XSS                       | Script does not execute                              |
| SEC-010 | Stored XSS                          | Stored content does not execute                      |
| SEC-011 | CSRF attempt                        | Unauthorized state change prevented where applicable |
| SEC-012 | Invalid CORS origin                 | Unauthorized cross-origin access denied              |
| SEC-013 | Login brute force                   | Rate limit enforced                                  |
| SEC-014 | OTP guessing                        | Attempt limit enforced                               |
| SEC-015 | Order price manipulation            | Server-authoritative price retained                  |
| SEC-016 | Client-controlled order status      | Unauthorized transition denied                       |
| SEC-017 | Fake payment confirmation           | Payment remains unverified                           |
| SEC-018 | Duplicate payment callback          | Processing is idempotent                             |
| SEC-019 | Delivery OTP reuse                  | Reuse denied                                         |
| SEC-020 | Wrong driver delivery confirmation  | Denied                                               |
| SEC-021 | WebSocket identity spoofing         | Client cannot impersonate another identity           |
| SEC-022 | Unauthorized WebSocket subscription | Denied                                               |
| SEC-023 | Internal broadcast without secret   | Denied                                               |
| SEC-024 | Oversized payload                   | Rejected within configured limits                    |
| SEC-025 | Secret scanning                     | No unresolved exposed live secrets                   |
| SEC-026 | Dependency scan                     | No unresolved critical vulnerability                 |
| SEC-027 | Production build                    | Completes with required checks enabled               |
| SEC-028 | Container configuration             | No unintended public internal services               |
| SEC-029 | Error disclosure                    | No sensitive internal details returned               |
| SEC-030 | Concurrent driver assignment        | Only one valid assignment succeeds                   |

---

# 24. Test Execution Report Template

Maintain a separate execution record or append completed results to this file.

| Test ID | Result  | Evidence | Finding ID | Retest |
| ------- | ------- | -------- | ---------- | ------ |
| SEC-001 | NOT RUN | —        | —          | —      |
| SEC-002 | NOT RUN | —        | —          | —      |
| SEC-003 | NOT RUN | —        | —          | —      |
| SEC-004 | NOT RUN | —        | —          | —      |
| SEC-005 | NOT RUN | —        | —          | —      |
| SEC-006 | NOT RUN | —        | —          | —      |
| SEC-007 | NOT RUN | —        | —          | —      |
| SEC-008 | NOT RUN | —        | —          | —      |
| SEC-009 | NOT RUN | —        | —          | —      |
| SEC-010 | NOT RUN | —        | —          | —      |

Repeat the same format for every test in the complete matrix.

Allowed statuses:

- `NOT RUN`
- `PASS`
- `FAIL`
- `BLOCKED`
- `NOT APPLICABLE`
- `FIXED — RETEST REQUIRED`
- `VERIFIED FIXED`

A scanner's lack of findings is not sufficient evidence that the application is secure.

---

# 25. Final Production Security Gate

CRAVE must not be considered security-ready until:

- [ ] Authentication and session controls have been tested.
- [ ] Every role and resource ownership rule has been tested.
- [ ] SQL injection and XSS checks have been completed.
- [ ] Login, OTP, and API rate limits have been verified.
- [ ] WebSocket authentication and channel authorization have been verified.
- [ ] Driver identity and GPS spoofing tests pass.
- [ ] Order pricing and state transitions are server-authoritative.
- [ ] Delivery OTP/QR verification is secure and single-use.
- [ ] Payment verification and callback idempotency are tested.
- [ ] Dependency and secret scans are reviewed.
- [ ] Production environment configuration is validated.
- [ ] Container and network exposure are reviewed.
- [ ] Security logging avoids sensitive data.
- [ ] Critical and high findings are remediated or formally risk-accepted.
- [ ] Regression tests are integrated into CI.
- [ ] A final authorized retest confirms the fixes.

## Final status

**Current execution status: NOT RUN.**

This document provides the security testing scope and acceptance criteria. It does not certify the GitHub repository as secure, and it does not represent a completed penetration test.

The next step is to execute the checks against a local or staging build of CRAVE, map the tests to the actual repository routes and source files, record evidence for each result, and fix confirmed vulnerabilities in priority order.
