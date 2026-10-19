import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { OrderStatus, UserRole } from '@prisma/client'
import {
  DEFAULT_MAX_LOCATION_AGE_MS,
  DEFAULT_STALE_LOCATION_MS,
  getDriverLocation,
  getAllDriverLocations,
  type DriverLocationState,
} from '@/lib/dispatch/driver-tracker'
import { withTiming } from '@/lib/instrumentation'

async function verifyAdminAuth(request: Request): Promise<boolean> {
  let token = ''
  const authHeader =
    typeof request.headers?.get === 'function' ? request.headers.get('authorization') : null
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('crave_auth_token') ?? cookieStore.get('drop_auth_token')
    if (cookie) token = cookie.value
  }

  if (!token) return false

  const payload = await verifyToken(token)
  return payload?.role === 'admin'
}

// Active order statuses relevant to the live map.
// Delivered, completed, and cancelled orders are excluded to keep the
// response compact and focused on in-flight activity.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.payment_submitted,
  OrderStatus.payment_pending,
  OrderStatus.sent_to_vendor,
  OrderStatus.preparing,
  OrderStatus.packing,
  OrderStatus.ready_for_pickup,
  OrderStatus.rider_assigned,
  OrderStatus.picked_up,
  OrderStatus.out_for_delivery,
]

// Temporary compatibility window for app builds that were released before the
// durable current-location table existed. The current table remains the source
// of truth; recent history is only used when that row has not been created yet.
const RECENT_DRIVER_HISTORY_FALLBACK_MS = 15 * 60 * 1000

export async function GET(request: Request) {
  return withTiming('GET /api/admin/map-live-analytics', async (mark) => {
    const isAdmin = await verifyAdminAuth(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 })
    }
    mark('auth')

    try {
      // Run independent DB reads concurrently so live-map latency is bounded by
      // the slowest query instead of the sum of every query.
      const currentLocationCutoff = new Date(Date.now() - DEFAULT_MAX_LOCATION_AGE_MS)
      const recentHistoryCutoff = new Date(Date.now() - RECENT_DRIVER_HISTORY_FALLBACK_MS)
      const [
        restaurants,
        orders,
        drivers,
        customerAddresses,
        currentDriverLocations,
        recentDriverHistory,
      ] = await Promise.all([
        // 1. Fetch restaurants — static/slow-changing; cap at 20
        prisma.restaurant.findMany({
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            is_open: true,
            is_dark_store: true,
            rating: true,
            delivery_minutes: true,
          },
          orderBy: { created_at: 'desc' },
          take: 20,
        }),

        // 2. Fetch live/recent ACTIVE orders only — exclude terminal statuses to
        //    keep response compact.  Previously all statuses were loaded including
        //    delivered/cancelled records that add no map value.
        prisma.order.findMany({
          select: {
            id: true,
            customer_name: true,
            customer_address: true,
            delivery_latitude: true,
            delivery_longitude: true,
            status: true,
            driver_name: true,
            restaurant_name: true,
            total_amount: true,
            created_at: true,
          },
          where: {
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          orderBy: { created_at: 'desc' },
          take: 25,
        }),

        // 3. Fetch rider users — only fields needed for the map pin
        prisma.user.findMany({
          where: { role: UserRole.rider },
          select: {
            id: true,
            name: true,
            phone: true,
            vehicle_type: true,
            license_plate: true,
            address: true,
          },
        }),

        // 4. Customer saved addresses — only geocoded rows are useful on the map
        prisma.customerAddress?.findMany?.({
          select: {
            id: true,
            label: true,
            address: true,
            latitude: true,
            longitude: true,
            customer: {
              select: { name: true },
            },
          },
          where: {
            // P1.1 FIX: Only fetch addresses that actually have coordinates.
            // Previously all saved addresses were loaded and non-geocoded ones
            // silently fell back to city-centre coordinates, creating phantom pins.
            latitude: { not: null },
            longitude: { not: null },
          },
          take: 25,
        }) ?? Promise.resolve([]),

        // 5. Durable current GPS rows make live riders visible across server
        //    processes and after deployments. Only fresh, non-offline rows are read.
        prisma.driverCurrentLocation.findMany({
          where: {
            updated_at: { gte: currentLocationCutoff },
            status: { not: 'OFFLINE' },
          },
        }),

        // 6. Compatibility fallback for riders still talking to an older
        //    server build. Bound the result and keep only the latest row per
        //    rider below; this path is never preferred over current telemetry.
        prisma.driverLocationHistory.findMany({
          where: { timestamp: { gte: recentHistoryCutoff } },
          orderBy: { timestamp: 'desc' },
          take: 500,
        }),
      ])
      mark('db')

      // Transform DB records into live telemetry pins
      const pins: Array<{
        id: string
        name: string
        type: 'driver' | 'restaurant' | 'order'
        status: string
        lat: number
        lng: number
        hasGps: boolean // P1.1 FIX: explicit GPS availability flag
        locationName: string
        detail: string
        timestamp: string
      }> = []

      // Map Restaurants
      restaurants.forEach((r) => {
        const hasGps = r.latitude != null && r.longitude != null
        // P1.1 FIX: Do not substitute city-centre coordinates for restaurants
        // without a geocoded address — show hasGps=false so the UI can render a
        // different indicator instead of placing a pin at a misleading location.
        if (!hasGps) return

        pins.push({
          id: `rst_${r.id}`,
          name: r.name,
          type: 'restaurant',
          status: r.is_open ? 'Kitchen Open & Active' : 'Kitchen Closed',
          lat: Number(r.latitude),
          lng: Number(r.longitude),
          hasGps: true,
          locationName: r.address || 'Kanakapura Corridor',
          detail: `${r.is_dark_store ? 'Dark Store' : 'Partner Restaurant'} • Avg Prep: ${r.delivery_minutes || 15} mins`,
          timestamp: 'Live DB Stream',
        })
      })

      // Map Drivers with Real-Time Live Device GPS Coordinates (Only if GPS is acquired from device)
      const trackedDriverIds = new Set<string>()
      const durableLocations = new Map<string, DriverLocationState>()
      const historyFallbackLocations = new Map<string, DriverLocationState>()

      currentDriverLocations.forEach((location) => {
        const ageMs = Date.now() - location.updated_at.getTime()
        const status = ['ONLINE', 'OFFLINE', 'ON_TRIP'].includes(location.status)
          ? (location.status as DriverLocationState['status'])
          : 'ONLINE'
        durableLocations.set(location.driver_id, {
          driverId: location.driver_id,
          name: `Driver ${location.driver_id.slice(0, 6)}`,
          phone: '',
          vehicleType: location.vehicle_type || 'EV_SCOOTER',
          status,
          available: location.available,
          lat: Number(location.latitude),
          lng: Number(location.longitude),
          h3Cell: location.h3_cell,
          resolution: location.resolution,
          lastUpdated: location.updated_at.getTime(),
          reportedAt: location.reported_at.getTime(),
          isStale: ageMs > DEFAULT_STALE_LOCATION_MS,
          staleDurationSeconds: Math.floor(ageMs / 1000),
        })
      })

      recentDriverHistory.forEach((location) => {
        if (historyFallbackLocations.has(location.driver_id)) return
        const lastUpdated = location.timestamp.getTime()
        const ageMs = Date.now() - lastUpdated
        historyFallbackLocations.set(location.driver_id, {
          driverId: location.driver_id,
          name: `Driver ${location.driver_id.slice(0, 6)}`,
          phone: '',
          vehicleType: 'EV_SCOOTER',
          status: 'ONLINE',
          available: true,
          lat: Number(location.latitude),
          lng: Number(location.longitude),
          h3Cell: location.h3_cell,
          resolution: 8,
          lastUpdated,
          reportedAt: lastUpdated,
          isStale: ageMs > DEFAULT_STALE_LOCATION_MS,
          staleDurationSeconds: Math.floor(ageMs / 1000),
        })
      })

      drivers.forEach((d) => {
        const cleanId = d.id.replace(/^drv_/, '')
        trackedDriverIds.add(d.id)
        trackedDriverIds.add(cleanId)
        trackedDriverIds.add(`drv_${cleanId}`)

        const memoryLocation = getDriverLocation(d.id) || getDriverLocation(cleanId)
        const durableLocation = durableLocations.get(d.id) || durableLocations.get(cleanId)
        const currentLocation =
          memoryLocation &&
          (!durableLocation || memoryLocation.lastUpdated >= durableLocation.lastUpdated)
            ? memoryLocation
            : durableLocation
        const historyLocation =
          historyFallbackLocations.get(d.id) || historyFallbackLocations.get(cleanId)
        const liveLoc = currentLocation || historyLocation
        const isHistoryFallback = !currentLocation && Boolean(historyLocation)

        // Only display rider pin if actual live device GPS coordinates are present
        if (liveLoc && typeof liveLoc.lat === 'number' && typeof liveLoc.lng === 'number') {
          pins.push({
            id: `drv_${cleanId}`,
            name: `${d.name} (${d.vehicle_type || 'EV Fleet'})`,
            type: 'driver',
            status: isHistoryFallback
              ? 'Status: Recent rider GPS'
              : `Status: ${liveLoc.status || 'ONLINE'}`,
            lat: liveLoc.lat,
            lng: liveLoc.lng,
            hasGps: true,
            locationName: d.address || 'Live Mobile GPS Feed',
            detail: `Plate: ${d.license_plate || 'EV-REG-01'} • Contact: ${d.phone || 'N/A'}${
              isHistoryFallback ? ' • Compatibility telemetry' : ''
            }`,
            timestamp: `${isHistoryFallback ? 'Recent' : 'Live'} Device GPS (${new Date(
              liveLoc.lastUpdated
            ).toLocaleTimeString()})`,
          })
        }
      })

      // Include durable rows even if a legacy driver account is not returned by
      // the rider-user query. The foreign key still guarantees a real user.
      durableLocations.forEach((liveLoc) => {
        const cleanLocId = liveLoc.driverId.replace(/^drv_/, '')
        if (
          liveLoc.driverId !== 'driver_partner' &&
          !trackedDriverIds.has(liveLoc.driverId) &&
          !trackedDriverIds.has(cleanLocId) &&
          !trackedDriverIds.has(`drv_${cleanLocId}`)
        ) {
          trackedDriverIds.add(liveLoc.driverId)
          trackedDriverIds.add(cleanLocId)
          pins.push({
            id: `drv_${cleanLocId}`,
            name: liveLoc.name || `Rider (${cleanLocId.slice(0, 8)})`,
            type: 'driver',
            status: `Status: ${liveLoc.status}`,
            lat: liveLoc.lat,
            lng: liveLoc.lng,
            hasGps: true,
            locationName: 'Live Mobile GPS Feed',
            detail: `Vehicle: ${liveLoc.vehicleType} • Active Telemetry`,
            timestamp: `Live Device GPS (${new Date(liveLoc.lastUpdated).toLocaleTimeString()})`,
          })
        }
      })

      // Include any live device driver sessions registered in memory tracker
      getAllDriverLocations().forEach((liveLoc) => {
        const cleanLocId = liveLoc.driverId.replace(/^drv_/, '')
        if (
          liveLoc.driverId !== 'driver_partner' &&
          !trackedDriverIds.has(liveLoc.driverId) &&
          !trackedDriverIds.has(cleanLocId) &&
          !trackedDriverIds.has(`drv_${cleanLocId}`) &&
          typeof liveLoc.lat === 'number' &&
          typeof liveLoc.lng === 'number'
        ) {
          trackedDriverIds.add(liveLoc.driverId)
          trackedDriverIds.add(cleanLocId)
          pins.push({
            id: `drv_${cleanLocId}`,
            name: liveLoc.name || `Rider (${cleanLocId.slice(0, 8)})`,
            type: 'driver',
            status: `Status: ${liveLoc.status || 'ONLINE'}`,
            lat: liveLoc.lat,
            lng: liveLoc.lng,
            hasGps: true,
            locationName: 'Live Device GPS Feed',
            detail: `Vehicle: ${liveLoc.vehicleType || 'EV_SCOOTER'} • Active Telemetry`,
            timestamp: `Live Device GPS (${new Date(liveLoc.lastUpdated).toLocaleTimeString()})`,
          })
        }
      })

      // Address deduplication map (merges order delivery spots with saved customer addresses)
      const addressPinMap = new Map<string, (typeof pins)[0]>()

      const getAddressKey = (addrStr?: string | null, lat?: number | null, lng?: number | null) => {
        const normalizedAddr = addrStr
          ? addrStr
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
          : ''
        if (normalizedAddr) return normalizedAddr
        if (lat != null && lng != null) return `${lat.toFixed(4)}_${lng.toFixed(4)}`
        return null
      }

      // Process Saved Customer Addresses
      // (already filtered to latitude/longitude NOT NULL by the DB query above)
      ;(customerAddresses as any[]).forEach((addr: any) => {
        if (addr.latitude != null && addr.longitude != null) {
          const key = getAddressKey(addr.address, Number(addr.latitude), Number(addr.longitude))
          const pinObj: (typeof pins)[0] = {
            id: `addr_${addr.id}`,
            name: `${addr.label || 'Saved Location'} (${addr.customer?.name || 'Customer'})`,
            type: 'order',
            status: 'Customer Saved Location',
            lat: Number(addr.latitude),
            lng: Number(addr.longitude),
            hasGps: true,
            locationName: addr.address,
            detail: `Saved Address: ${addr.address} • User: ${addr.customer?.name || 'Customer'}`,
            timestamp: 'Saved in DB',
          }
          if (key) {
            addressPinMap.set(key, pinObj)
          } else {
            pins.push(pinObj)
          }
        }
      })

      // Process Orders — P1.1 FIX: skip orders without coordinates instead of
      // placing them at a fixed city-centre point, which would create misleading pins.
      orders.forEach((o: any) => {
        const hasGps =
          o.delivery_latitude != null &&
          o.delivery_longitude != null &&
          Number.isFinite(Number(o.delivery_latitude)) &&
          Number.isFinite(Number(o.delivery_longitude))

        if (!hasGps) return // Skip — no valid coordinates; do not place phantom pin.

        const lat = Number(o.delivery_latitude)
        const lng = Number(o.delivery_longitude)
        const key = getAddressKey(o.customer_address, lat, lng)

        if (key && addressPinMap.has(key)) {
          const existing = addressPinMap.get(key)!
          existing.status = `Order #${o.id.slice(0, 8)} (${o.status.replace(/_/g, ' ')})`
          existing.detail = `${existing.detail} • Order total: ₹${o.total_amount}`
          if (o.created_at) existing.timestamp = new Date(o.created_at).toLocaleTimeString()
        } else {
          const newPin: (typeof pins)[0] = {
            id: `ord_${o.id}`,
            name: `Order #${o.id.slice(0, 8)} (${o.customer_name})`,
            type: 'order',
            status: `Status: ${o.status.replace(/_/g, ' ')}`,
            lat,
            lng,
            hasGps: true,
            locationName: o.customer_address || 'Delivery Address',
            detail: `Restaurant: ${o.restaurant_name} • Total: ₹${o.total_amount}`,
            timestamp: o.created_at ? new Date(o.created_at).toLocaleTimeString() : 'Recent',
          }
          if (key) {
            addressPinMap.set(key, newPin)
          } else {
            pins.push(newPin)
          }
        }
      })

      // Append deduplicated address pins
      pins.push(...Array.from(addressPinMap.values()))

      const openKitchensCount = restaurants.filter((r: any) => r.is_open).length
      const activeRidersCount = pins.filter((pin) => pin.type === 'driver').length
      const activeOrdersCount = orders.length
      mark('processing')

      return NextResponse.json({
        success: true,
        stats: {
          activeRidersCount,
          openKitchensCount,
          activeOrdersCount,
          totalRestaurants: restaurants.length,
          highDemandZone: 'Kanakapura Corridor',
        },
        pins,
      })
    } catch (err) {
      console.error('[GET /api/admin/map-live-analytics]', err)
      return NextResponse.json({ error: 'Failed to fetch map analytics' }, { status: 500 })
    }
  })
}
