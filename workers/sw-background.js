// Driver Background Telemetry Service Worker
// Listens for background sync events and maintains background GPS sync capability when browser is minimized or in recent apps

const CACHE_NAME = 'crave-driver-sync-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for messages from Driver Context / Main Thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', status: 'ACTIVE' })
  }
})

// Handle background sync events if triggered by browser
self.addEventListener('sync', (event) => {
  if (event.tag === 'driver-location-sync') {
    event.waitUntil(syncPendingLocationData())
  }
})

async function syncPendingLocationData() {
  console.log('[Service Worker] Executing background driver location sync...')
}
