import assert from 'node:assert/strict'
import test from 'node:test'
import { GET as healthGet } from '../app/api/health/route'
import { GET as readyGet } from '../app/api/health/ready/route'

test('GET /api/health returns liveness probe with database and redis statuses', async () => {
  const req = new Request('http://localhost:3000/api/health', {
    method: 'GET',
  })
  const res = await healthGet(req)
  assert.ok(res.status === 200 || res.status === 503, `Expected 200 or 503, got ${res.status}`)
  
  const data = await res.json()
  assert.ok(data.status, 'Expected status in health probe response')
  assert.ok(data.timestamp, 'Expected timestamp in health probe response')
  assert.ok(data.services, 'Expected services object in health probe response')
  assert.ok(data.services.database, 'Expected database service info')
  assert.ok(data.services.redis, 'Expected redis service info')
})

test('GET /api/health?details=true rejects unauthenticated callers', async () => {
  const req = new Request('http://localhost:3000/api/health?details=true', {
    method: 'GET',
  })
  const res = await healthGet(req)
  assert.ok(res.status === 401 || res.status === 403, `Expected 401/403 for unauthenticated details, got ${res.status}`)
  
  const data = await res.json()
  assert.ok(data.error, 'Expected error message in response')
})

test('GET /api/health/ready returns readiness checks with dependency details', async () => {
  const res = await readyGet()
  assert.ok(res.status === 200 || res.status === 503, `Expected 200 or 503 for readiness, got ${res.status}`)

  const data = await res.json()
  assert.ok(data.status, 'Expected status in readiness response')
  assert.ok(data.timestamp, 'Expected timestamp in readiness response')
  assert.ok(typeof data.responseTimeMs === 'number', 'Expected responseTimeMs number')
  assert.ok(data.checks, 'Expected checks object')
  assert.ok(data.checks.database, 'Expected database check')
  assert.ok(data.checks.redis, 'Expected redis check')
})
