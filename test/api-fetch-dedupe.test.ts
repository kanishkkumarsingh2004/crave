import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { apiFetch, clearApiFetchCache } from '../lib/client/api-fetch'

const nativeFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = nativeFetch
  clearApiFetchCache()
})

test('apiFetch coalesces matching GET requests and gives each caller a readable body', async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    await new Promise((resolve) => setTimeout(resolve, 5))
    return Response.json({ calls })
  }) as typeof fetch

  const [first, second] = await Promise.all([apiFetch('/api/example'), apiFetch('/api/example')])

  assert.equal(calls, 1)
  assert.deepEqual(await first.json(), { calls: 1 })
  assert.deepEqual(await second.json(), { calls: 1 })
})

test('apiFetch invalidates short-lived GET results after a successful mutation', async () => {
  let calls = 0
  globalThis.fetch = (async () => {
    calls += 1
    return Response.json({ calls })
  }) as typeof fetch

  await apiFetch('/api/example')
  await apiFetch('/api/example')
  assert.equal(calls, 1)

  await apiFetch('/api/example', { method: 'PATCH' })
  await apiFetch('/api/example')
  assert.equal(calls, 3)
})
