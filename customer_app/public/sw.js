/**
 * Crave customer app — offline cache.
 *
 * Three layers, so the app opens instantly and keeps working when the
 * network does not:
 *
 *   1. the app shell (index.html) is precached on install;
 *   2. static assets are cache-first — they are content-hashed, so they never
 *      change under the same name;
 *   3. API reads are network-first with a cache fallback, so a fresh answer
 *      always wins and a stale one is better than an error.
 *
 * Writes (POST/PATCH/PUT/DELETE) are never cached.
 */

const VERSION = 'crave-customer-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const API_CACHE = `${VERSION}-api`

const SHELL_URLS = ['/', '/index.html']

/** API reads worth keeping for offline. */
const CACHEABLE_API = ['/api/restaurants', '/api/menu-items', '/api/orders', '/api/user/addresses']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

function isCacheableApi(url) {
  if (!url.pathname.startsWith('/api/')) return false
  return CACHEABLE_API.some((path) => url.pathname.startsWith(path))
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // ── Static assets: cache first, then fill the cache in the background. ──
  if (sameOrigin && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const copy = response.clone()
                caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
              }
              return response
            })
            .catch(() => caches.match('/index.html'))
      )
    )
    return
  }

  // ── API reads: network first, then the cached copy. ──
  if (sameOrigin && isCacheableApi(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(API_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // ── The shell for navigations, so a reload works offline. ──
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
  }
})
