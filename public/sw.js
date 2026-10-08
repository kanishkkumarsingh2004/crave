const CACHE_NAME = 'crave-pwa-v1'
const OFFLINE_URL = '/offline.html'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
]

// Install event - precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - purge old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - offline fallback and asset caching
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // Never intercept API endpoints, websockets, or Next.js dev server hot reloads
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__ws') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return
  }

  // Navigation requests: Network-First with fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
        const offlineResponse = await cache.match(OFFLINE_URL)
        return offlineResponse || new Response('Offline', { status: 503, statusText: 'Offline' })
      })
    )
    return
  }

  // Static assets (Next static scripts, styles, icons, images): Cache-first or Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch updated version in background to keep cache fresh
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse))
              }
            })
            .catch(() => {})
          return cachedResponse
        }

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse
            }
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
            return networkResponse
          })
          .catch(() => cachedResponse)
      })
    )
    return
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request)
      return cached || new Response(null, { status: 404 })
    })
  )
})
