const DEFAULT_DEDUPE_WINDOW_MS = 1500

type CachedRequest = {
  promise: Promise<Response>
  expiresAt: number
  cleanupTimer?: ReturnType<typeof setTimeout>
}

const requestCache = new Map<string, CachedRequest>()

function requestKey(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : null
  const method = (init?.method || request?.method || 'GET').toUpperCase()
  const url = request?.url || String(input)
  const headers = new Headers(request?.headers)
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
  const normalizedHeaders = [...headers.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )

  return JSON.stringify([
    method,
    url,
    init?.credentials || request?.credentials || 'same-origin',
    normalizedHeaders,
  ])
}

/**
 * Browser API fetch with in-flight request coalescing and a tiny replay window.
 *
 * React development remounts and WebSocket hydration can request the same GET
 * more than once in quick succession. Keeping the untouched Response here and
 * returning a clone gives every consumer its own readable body while issuing
 * only one network request. Mutations bypass the cache and invalidate it after
 * success so reads never reuse data from before a write.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS
): Promise<Response> {
  const request = input instanceof Request ? input : null
  const method = (init?.method || request?.method || 'GET').toUpperCase()

  if (method !== 'GET' && method !== 'HEAD') {
    const response = await fetch(input, init)
    if (response.ok) clearApiFetchCache()
    return response
  }

  const key = requestKey(input, init)
  const now = Date.now()
  const existing = requestCache.get(key)
  if (existing && (existing.expiresAt === Number.POSITIVE_INFINITY || existing.expiresAt > now)) {
    return (await existing.promise).clone()
  }
  if (existing) {
    if (existing.cleanupTimer) clearTimeout(existing.cleanupTimer)
    requestCache.delete(key)
  }

  const entry: CachedRequest = {
    expiresAt: Number.POSITIVE_INFINITY,
    promise: Promise.resolve(null as unknown as Response),
  }

  entry.promise = fetch(input, init)
    .then((response) => {
      if (!response.ok) {
        requestCache.delete(key)
        return response
      }

      entry.expiresAt = Date.now() + dedupeWindowMs
      entry.cleanupTimer = setTimeout(() => {
        if (requestCache.get(key) === entry) requestCache.delete(key)
      }, dedupeWindowMs)
      return response
    })
    .catch((error) => {
      requestCache.delete(key)
      throw error
    })

  requestCache.set(key, entry)
  return (await entry.promise).clone()
}

export function clearApiFetchCache() {
  for (const entry of requestCache.values()) {
    if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer)
  }
  requestCache.clear()
}
