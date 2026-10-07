// Spatial Analytics Web Worker
// Performs background processing for map telemetry density, pin filtering & H3 spatial hex indexing

self.onmessage = function (event) {
  const { type, payload } = event.data || {}

  switch (type) {
    case 'PROCESS_SPATIAL_DENSITY':
      if (payload && Array.isArray(payload.pins)) {
        const result = computePinSpatialStats(payload.pins, payload.centerLat, payload.centerLng)
        self.postMessage({
          type: 'SPATIAL_DENSITY_RESULT',
          stats: result,
        })
      }
      break

    default:
      break
  }
}

function computePinSpatialStats(pins, centerLat, centerLng) {
  let driversCount = 0
  let kitchensCount = 0
  let addressesCount = 0

  pins.forEach((p) => {
    if (p.type === 'driver') driversCount++
    else if (p.type === 'restaurant') kitchensCount++
    else if (p.type === 'order') addressesCount++
  })

  return {
    totalPins: pins.length,
    driversCount,
    kitchensCount,
    addressesCount,
    processedAt: new Date().toISOString(),
  }
}
