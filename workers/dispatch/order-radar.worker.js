// Order Dispatch Radar Web Worker
// Performs background calculations for driver-to-kitchen proximity & candidate scoring

self.onmessage = function (event) {
  const { type, payload } = event.data || {}

  switch (type) {
    case 'CALCULATE_DISPATCH_RADAR':
      if (payload && payload.driverLat && payload.driverLng && Array.isArray(payload.orders)) {
        const matches = findNearbyDispatchCandidates(
          payload.driverLat,
          payload.driverLng,
          payload.orders
        )
        self.postMessage({
          type: 'DISPATCH_RADAR_RESULTS',
          matches,
        })
      }
      break

    default:
      break
  }
}

function findNearbyDispatchCandidates(driverLat, driverLng, orders) {
  return orders.map((o) => {
    const orderLat = o.delivery_latitude || 12.9352
    const orderLng = o.delivery_longitude || 77.6245
    const distKm = haversineKm(driverLat, driverLng, orderLat, orderLng)
    return {
      orderId: o.id,
      distanceKm: Math.round(distKm * 10) / 10,
      etaMins: Math.max(5, Math.round(distKm * 3 + 10)),
    }
  })
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
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
