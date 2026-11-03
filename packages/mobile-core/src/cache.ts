const DEFAULT_CACHE_ORIGIN = 'https://mobile-cache.crave.internal'

export interface CacheStorageAdapter {
  read<T>(key: string): Promise<T | null>
  write(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

export interface CacheStorageAdapterOptions {
  namespace: string
  version?: number
  maxEntryBytes?: number
  maxEntries?: number
  maxAgeMs?: number
  cacheOrigin?: string
  storage?: CacheStorage
  now?: () => number
  measureBytes?: (serialized: string) => number
}

function fallbackFingerprint(value: string): string {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0)
    .toString(16)
    .padStart(8, '0')}`
}

/** Produces an account-isolated cache key without persisting the raw auth token. */
export async function createAccountCacheKey(path: string, token: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return `${fallbackFingerprint(token)}::${path}`
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(token))
  const fingerprint = Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
  return `${fingerprint}::${path}`
}

export function createCacheStorageAdapter(
  options: CacheStorageAdapterOptions
): CacheStorageAdapter {
  const cacheName = `crave-${options.namespace}-data-v${options.version ?? 1}`
  const cacheOrigin = (options.cacheOrigin || DEFAULT_CACHE_ORIGIN).replace(/\/$/, '')
  const maxEntryBytes = options.maxEntryBytes ?? 6 * 1024 * 1024
  const maxEntries = options.maxEntries ?? 64
  const maxAgeMs = options.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000
  const now = options.now || Date.now
  const measureBytes = options.measureBytes || ((value: string) => new Blob([value]).size)

  function storage(): CacheStorage | null {
    if (options.storage) return options.storage
    return typeof globalThis !== 'undefined' && 'caches' in globalThis ? globalThis.caches : null
  }

  function requestFor(key: string): Request {
    return new Request(`${cacheOrigin}/${options.namespace}/${encodeURIComponent(key)}`)
  }

  async function prune(cache: Cache): Promise<void> {
    const keys = await cache.keys()
    if (keys.length <= maxEntries) return
    const dated = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request)
        return { request, cachedAt: Number(response?.headers.get('x-crave-cached-at') || 0) }
      })
    )
    dated.sort((left, right) => left.cachedAt - right.cachedAt)
    await Promise.all(
      dated.slice(0, keys.length - maxEntries).map(({ request }) => cache.delete(request))
    )
  }

  return {
    async read<T>(key: string): Promise<T | null> {
      const cacheStorage = storage()
      if (!cacheStorage) return null
      try {
        const cache = await cacheStorage.open(cacheName)
        const request = requestFor(key)
        const response = await cache.match(request)
        if (!response) return null
        const cachedAt = Number(response.headers.get('x-crave-cached-at') || 0)
        if (!cachedAt || now() - cachedAt > maxAgeMs) {
          await cache.delete(request)
          return null
        }
        return (await response.json()) as T
      } catch {
        return null
      }
    },

    async write(key: string, value: unknown): Promise<void> {
      const cacheStorage = storage()
      if (!cacheStorage) return
      try {
        const serialized = JSON.stringify(value)
        if (measureBytes(serialized) > maxEntryBytes) return
        const cache = await cacheStorage.open(cacheName)
        await cache.put(
          requestFor(key),
          new Response(serialized, {
            headers: {
              'content-type': 'application/json',
              'x-crave-cached-at': String(now()),
            },
          })
        )
        await prune(cache)
      } catch {
        // Cache quota and serialization failures never invalidate a live response.
      }
    },

    async clear(): Promise<void> {
      await storage()
        ?.delete(cacheName)
        .catch(() => false)
    },
  }
}
