const CACHE_NAME = 'crave-restaurant-data-v1'
const CACHE_ORIGIN = 'https://mobile-cache.crave.internal'
const MAX_ENTRY_BYTES = 6 * 1024 * 1024
const MAX_ENTRIES = 64
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function isAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window
}

function requestFor(path: string): Request {
  return new Request(`${CACHE_ORIGIN}/restaurant/${encodeURIComponent(path)}`)
}

async function prune(cache: Cache): Promise<void> {
  const keys = await cache.keys()
  if (keys.length <= MAX_ENTRIES) return
  const dated = await Promise.all(
    keys.map(async (request) => {
      const response = await cache.match(request)
      return { request, cachedAt: Number(response?.headers.get('x-crave-cached-at') || 0) }
    })
  )
  dated.sort((a, b) => a.cachedAt - b.cachedAt)
  await Promise.all(
    dated.slice(0, keys.length - MAX_ENTRIES).map(({ request }) => cache.delete(request))
  )
}

export async function readCachedApiResponse<T>(path: string): Promise<T | null> {
  if (!isAvailable()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const request = requestFor(path)
    const response = await cache.match(request)
    if (!response) return null
    const cachedAt = Number(response.headers.get('x-crave-cached-at') || 0)
    if (!cachedAt || Date.now() - cachedAt > MAX_AGE_MS) {
      await cache.delete(request)
      return null
    }
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function cacheApiResponse(path: string, data: unknown): Promise<void> {
  if (!isAvailable()) return
  try {
    const serialized = JSON.stringify(data)
    if (new Blob([serialized]).size > MAX_ENTRY_BYTES) return
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      requestFor(path),
      new Response(serialized, {
        headers: {
          'content-type': 'application/json',
          'x-crave-cached-at': String(Date.now()),
        },
      })
    )
    await prune(cache)
  } catch {
    // Storage quota failures must never interrupt the live API response.
  }
}

export async function clearMobileDataCache(): Promise<void> {
  if (!isAvailable()) return
  await caches.delete(CACHE_NAME).catch(() => false)
}
