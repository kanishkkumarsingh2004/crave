const CACHE_NAME = 'crave-pwa-v3'
const OFFLINE_URL = '/offline.html'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
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

// Fetch event - offline fallback and selective asset caching
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // CRITICAL: NEVER intercept cross-origin requests.
  // External map tiles (CartoCDN, OpenStreetMap), remote images (Unsplash),
  // CDNs, payment gateways, and telemetry should be handled directly by the browser.
  if (url.origin !== self.location.origin) {
    return
  }

  // Never intercept API endpoints, websockets, Next.js dev server / HMR, or MapLibre workers
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__ws') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/maplibre-gl-')
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

  // Local PWA static shell assets (icons, manifest): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/offline.html'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // For all other local requests, allow standard browser network handling
  // Do NOT hijack with artificial 404 responses.
})

// Display standards-based Web Push notifications while the PWA is in the background.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : 'You have a new Crave update.' }
  }

  const title = payload.title || 'crave.'
  const options = {
    body: payload.body || 'You have a new update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.tag || 'crave-update',
    renotify: true,
    data: {
      url: payload.url || '/',
      orderId: payload.orderId || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const requestedUrl = new URL(event.notification.data?.url || '/', self.location.origin)
  const targetUrl =
    requestedUrl.origin === self.location.origin ? requestedUrl.href : self.location.origin

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('navigate' in client) {
          client.navigate(targetUrl)
        }
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined
    })
  )
})
