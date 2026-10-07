// Driver Live Location Event-Driven Web Worker
// Processes real-time GPS coordinate deltas, speed, bearing & instant WebSocket/API broadcasting
// Completely event-driven: No time-based polling (setInterval) required

let driverId = null
let orderId = null
let lastLat = null
let lastLng = null
let lastHeading = null
let lastSpeed = null
let isOnline = false
let totalDistanceKm = 0

// Haversine Distance Helper (in meters)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

self.onmessage = function (event) {
  const { type, payload } = event.data || {}

  switch (type) {
    case 'INIT':
      if (payload) {
        driverId = payload.driverId || driverId
        orderId = payload.orderId || orderId
        isOnline = typeof payload.isOnline === 'boolean' ? payload.isOnline : true
        if (typeof payload.lat === 'number' && typeof payload.lng === 'number') {
          lastLat = payload.lat
          lastLng = payload.lng
          // Broadcast initial position
          broadcastEventDrivenLocation(payload.lat, payload.lng, 0, 0, 'INITIAL_INIT')
        }
      }
      break

    case 'EVENT_GPS_UPDATE':
      if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return
      }

      const {
        lat,
        lng,
        accuracy,
        speed,
        heading,
        driverId: msgDriverId,
        orderId: msgOrderId,
        isOnline: msgIsOnline,
      } = payload
      if (msgDriverId) driverId = msgDriverId
      if (msgOrderId !== undefined) orderId = msgOrderId
      if (typeof msgIsOnline === 'boolean') isOnline = msgIsOnline

      if (!isOnline || !driverId) return

      // Calculate GPS movement delta
      let distanceMoved = 0
      if (lastLat !== null && lastLng !== null) {
        distanceMoved = calculateDistanceMeters(lastLat, lastLng, lat, lng)
      } else {
        distanceMoved = 999 // Force first update
      }

      // Event-driven threshold: Trigger instant update if moved >= 1.5 meters, or first position, or heading shifted
      const headingShift =
        lastHeading !== null && heading !== null ? Math.abs(heading - lastHeading) : 0
      const isSignificantMove = distanceMoved >= 1.5 || headingShift >= 15 || lastLat === null

      if (isSignificantMove) {
        if (distanceMoved < 500) {
          // filter GPS jumps > 500m
          totalDistanceKm += distanceMoved / 1000
        }
        lastLat = lat
        lastLng = lng
        lastHeading = heading || lastHeading
        lastSpeed = speed || lastSpeed

        // Instantly transmit live coordinate stream without timer delay
        broadcastEventDrivenLocation(
          lat,
          lng,
          accuracy || 0,
          speed || 0,
          'GPS_DELTA_TRIGGER',
          distanceMoved
        )
      }
      break

    case 'FORCE_LIVE_SYNC':
      if (lastLat !== null && lastLng !== null && driverId) {
        broadcastEventDrivenLocation(lastLat, lastLng, 0, 0, 'FORCE_SYNC')
      }
      break

    case 'STOP':
      driverId = null
      lastLat = null
      lastLng = null
      break

    default:
      break
  }
}

async function broadcastEventDrivenLocation(
  lat,
  lng,
  accuracy,
  speed,
  triggerReason,
  distanceMoved = 0
) {
  if (!driverId || !isOnline) return

  const eventPacket = {
    driverId,
    orderId: orderId || undefined,
    lat,
    lng,
    accuracy,
    speed,
    heading: lastHeading,
    status: isOnline ? 'ONLINE' : 'OFFLINE',
    source: 'event_driven_live_worker',
    triggerReason,
    distanceMovedMeters: Math.round(distanceMoved * 10) / 10,
    timestamp: new Date().toISOString(),
  }

  // 1. Post back to main thread for immediate local UI stream
  self.postMessage({
    type: 'LIVE_STREAM_EMIT',
    packet: eventPacket,
  })

  // 2. Transmit directly to API endpoint asynchronously
  try {
    const res = await fetch('/api/driver/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPacket),
    })

    if (res.ok) {
      self.postMessage({
        type: 'LIVE_STREAM_SUCCESS',
        timestamp: eventPacket.timestamp,
        lat,
        lng,
        triggerReason,
      })
    }
  } catch (err) {
    self.postMessage({
      type: 'LIVE_STREAM_ERROR',
      error: err ? err.message : 'Network error in live event worker',
    })
  }
}
