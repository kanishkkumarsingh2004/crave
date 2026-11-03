import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ApiError,
  COOKIE_SESSION_TOKEN,
  createAccountCacheKey,
  createApiClient,
  createCacheStorageAdapter,
  createPlatformTokenStore,
  type ApiCachePolicy,
  type NativeHttpRequest,
  type TokenStore,
} from '../packages/mobile-core/src/index'

function memoryTokenStore(initial = ''): TokenStore & { value: string } {
  return {
    value: initial,
    async get() {
      return this.value
    },
    async set(token) {
      this.value = token
    },
    async clear() {
      this.value = ''
    },
  }
}

test('browser transport keeps relative paths, credentials, identity, body, and bearer rules', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  const client = createApiClient({
    appId: 'customer',
    apiOrigin: 'https://api.example.test/',
    isNative: () => false,
    nativeRequest: async () => assert.fail('native transport must not run in a browser'),
    browserFetch: async (input, init) => {
      calls.push({ input, init })
      return new Response('{"ok":true}', { status: 200 })
    },
    tokenStore: memoryTokenStore(),
    timeouts: { connectMs: 15_000, readMs: 25_000 },
  })

  await client.request('/api/orders', {
    method: 'post',
    token: 'jwt-token',
    body: { item: 1 },
  })
  await client.request('/api/auth/me', { token: COOKIE_SESSION_TOKEN })

  assert.equal(calls[0].input, '/api/orders')
  assert.equal(calls[0].init?.method, 'POST')
  assert.equal(calls[0].init?.credentials, 'include')
  assert.equal(calls[0].init?.body, '{"item":1}')
  assert.deepEqual(calls[0].init?.headers, {
    Accept: 'application/json',
    'X-Crave-Native-App': 'customer',
    'Content-Type': 'application/json',
    Authorization: 'Bearer jwt-token',
  })
  assert.equal(
    Object.hasOwn(calls[1].init?.headers as object, 'Authorization'),
    false,
    'the cookie-session sentinel must never become a bearer token'
  )
})

test('native transport applies configured origin, app identity, and per-app timeouts', async () => {
  let request: NativeHttpRequest | undefined
  const client = createApiClient({
    appId: 'driver',
    apiOrigin: 'https://api.example.test/',
    isNative: () => true,
    nativeRequest: async (input) => {
      request = input
      return { status: 200, data: '{"driver":true}' }
    },
    tokenStore: memoryTokenStore(),
    timeouts: { connectMs: 12_000, readMs: 19_000 },
  })

  assert.deepEqual(await client.request('/api/driver/profile', { token: 'driver-token' }), {
    driver: true,
  })
  assert.equal(request?.url, 'https://api.example.test/api/driver/profile')
  assert.equal(request?.headers['X-Crave-Native-App'], 'driver')
  assert.equal(request?.headers.Authorization, 'Bearer driver-token')
  assert.equal(request?.connectTimeout, 12_000)
  assert.equal(request?.readTimeout, 19_000)
})

test('cache fallback is policy-gated and never broadens to live order data', async () => {
  const profileKey = await createAccountCacheKey('/api/driver/profile', 'driver-token')
  const entries = new Map<string, unknown>([[profileKey, { cached: true }]])
  const cache: ApiCachePolicy = {
    shouldCache: ({ method, path, authenticated }) =>
      method === 'GET' && authenticated && path.startsWith('/api/driver/profile'),
    async read<T>(key: string) {
      return (entries.get(key) as T | undefined) ?? null
    },
    async write(key, value) {
      entries.set(key, value)
    },
    async clear() {
      entries.clear()
    },
  }
  const networkError = new Error('offline')
  const client = createApiClient({
    appId: 'driver',
    apiOrigin: 'https://api.example.test',
    isNative: () => true,
    nativeRequest: async () => {
      throw networkError
    },
    tokenStore: memoryTokenStore(),
    cache,
    timeouts: { connectMs: 15_000, readMs: 20_000 },
  })

  assert.deepEqual(await client.request('/api/driver/profile', { token: 'driver-token' }), {
    cached: true,
  })
  assert.equal(profileKey.includes('driver-token'), false, 'raw tokens must never appear in keys')
  await assert.rejects(
    client.request('/api/orders', { token: 'driver-token' }),
    (error) => error === networkError
  )
})

test('Cache Storage adapter expires, prunes, and rejects oversized entries', async () => {
  const entries = new Map<string, Response>()
  const cache = {
    async keys() {
      return Array.from(entries.keys(), (url) => new Request(url))
    },
    async match(request: Request) {
      return entries.get(request.url)?.clone()
    },
    async put(request: Request, response: Response) {
      entries.set(request.url, response.clone())
    },
    async delete(request: Request) {
      return entries.delete(request.url)
    },
  } as unknown as Cache
  const cacheStorage = {
    async open() {
      return cache
    },
    async delete() {
      entries.clear()
      return true
    },
  } as unknown as CacheStorage
  let now = 1_000
  const adapter = createCacheStorageAdapter({
    namespace: 'test',
    storage: cacheStorage,
    maxEntries: 2,
    maxEntryBytes: 20,
    maxAgeMs: 50,
    now: () => now,
    measureBytes: (value) => value.length,
  })

  await adapter.write('first', { value: 1 })
  now += 1
  await adapter.write('second', { value: 2 })
  now += 1
  await adapter.write('third', { value: 3 })
  assert.equal(entries.size, 2, 'the oldest entry is pruned')
  assert.equal(await adapter.read('first'), null)
  assert.deepEqual(await adapter.read('second'), { value: 2 })

  await adapter.write('oversized', { value: 'this payload is too large' })
  assert.equal(entries.size, 2, 'oversized entries are not stored')

  now += 100
  assert.equal(await adapter.read('second'), null, 'expired entries are deleted')
  assert.equal(entries.size, 1)
})

test('HTTP failures retain status and useful normalized error messages', async () => {
  const client = createApiClient({
    appId: 'admin',
    apiOrigin: 'https://api.example.test',
    isNative: () => false,
    nativeRequest: async () => assert.fail('native transport must not run in a browser'),
    browserFetch: async () =>
      new Response('<!doctype html><title>missing</title>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      }),
    tokenStore: memoryTokenStore(),
    timeouts: { connectMs: 15_000, readMs: 25_000 },
  })

  await assert.rejects(client.request('/api/missing'), (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 404)
    assert.match(error.message, /endpoint \/api\/missing is missing/)
    return true
  })
})

test('token storage remains app-keyed and account switching clears scoped cache', async () => {
  const browserValues = new Map<string, string>()
  const browserStore = {
    getItem: (key: string) => browserValues.get(key) ?? null,
    setItem: (key: string, value: string) => browserValues.set(key, value),
    removeItem: (key: string) => void browserValues.delete(key),
  }
  const customerStore = createPlatformTokenStore({
    key: 'crave_customer_auth_token',
    isNative: () => false,
    nativeStore: {
      get: async () => ({ value: null }),
      set: async () => {},
      remove: async () => {},
    },
    browserStore: () => browserStore,
  })
  const driverStore = createPlatformTokenStore({
    key: 'crave_driver_auth_token',
    isNative: () => false,
    nativeStore: {
      get: async () => ({ value: null }),
      set: async () => {},
      remove: async () => {},
    },
    browserStore: () => browserStore,
  })
  await customerStore.set('customer-token')
  await driverStore.set('driver-token')
  assert.equal(await customerStore.get(), 'customer-token')
  assert.equal(await driverStore.get(), 'driver-token')

  let clearCount = 0
  const client = createApiClient({
    appId: 'customer',
    apiOrigin: 'https://api.example.test',
    isNative: () => false,
    nativeRequest: async () => ({ status: 200, data: {} }),
    browserFetch: async () => new Response('{}'),
    tokenStore: customerStore,
    cache: {
      shouldCache: () => false,
      read: async () => null,
      write: async () => {},
      clear: async () => void clearCount++,
    },
    timeouts: { connectMs: 15_000, readMs: 25_000 },
  })
  await client.restoreAuthToken()
  await client.saveAuthToken('next-customer-token')
  assert.equal(clearCount, 1)
})
