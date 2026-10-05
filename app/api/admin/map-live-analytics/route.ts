import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { OrderStatus, UserRole } from '@prisma/client'

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

export async function GET(request: Request) {
  const isAdmin = await verifyAdminAuth(request)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 })
  }

  try {
    // 1. Fetch restaurants from DB
    const restaurants = await prisma.restaurant.findMany({
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
    })

    // 2. Fetch live/recent orders from DB
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        customer_name: true,
        customer_address: true,
        delivery_latitude: true,
        delivery_longitude: true,
        status: true,
        driver_name: true,
        driver_phone: true,
        restaurant_name: true,
        subtotal: true,
        total_amount: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
      take: 25,
    })

    // 3. Fetch rider users from DB
    const drivers = await prisma.user.findMany({
      where: { role: UserRole.rider },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicle_type: true,
        license_plate: true,
        address: true,
      },
    })

    // Transform DB records into live telemetry pins
    const pins: Array<{
      id: string
      name: string
      type: 'driver' | 'restaurant' | 'order'
      status: string
      lat: number
      lng: number
      locationName: string
      detail: string
      timestamp: string
    }> = []

    // Map Restaurants
    restaurants.forEach((r) => {
      const lat = r.latitude != null ? Number(r.latitude) : 12.6501
      const lng = r.longitude != null ? Number(r.longitude) : 77.4421
      pins.push({
        id: `rst_${r.id}`,
        name: r.name,
        type: 'restaurant',
        status: r.is_open ? 'Kitchen Open & Active' : 'Kitchen Closed',
        lat,
        lng,
        locationName: r.address || 'Kanakapura Corridor',
        detail: `${r.is_dark_store ? 'Dark Store' : 'Partner Restaurant'} • Avg Prep: ${r.delivery_minutes || 15} mins`,
        timestamp: 'Live DB Stream',
      })
    })

    // Map Orders
    const inTransitOrders = orders.filter(
      (o) =>
        o.status !== OrderStatus.delivered &&
        o.status !== OrderStatus.cancelled &&
        o.status !== OrderStatus.completed
    )
    orders.forEach((o) => {
      const lat = o.delivery_latitude != null ? Number(o.delivery_latitude) : 12.6455
      const lng = o.delivery_longitude != null ? Number(o.delivery_longitude) : 77.4398
      pins.push({
        id: `ord_${o.id}`,
        name: `Order #${o.id.slice(0, 8)} (${o.customer_name})`,
        type: 'order',
        status: `Status: ${o.status.replace(/_/g, ' ')}`,
        lat,
        lng,
        locationName: o.customer_address || 'Delivery Address',
        detail: `Restaurant: ${o.restaurant_name} • Total: ₹${o.total_amount}`,
        timestamp: o.created_at ? new Date(o.created_at).toLocaleTimeString() : 'Recent',
      })
    })

    // Map Drivers
    drivers.forEach((d, idx) => {
      const lat = 12.6415 + idx * 0.005
      const lng = 77.4369 + idx * 0.005
      pins.push({
        id: `drv_${d.id}`,
        name: `${d.name} (${d.vehicle_type || 'EV Fleet'})`,
        type: 'driver',
        status: 'Duty Active & Online',
        lat,
        lng,
        locationName: d.address || 'Bengaluru Fleet Sector',
        detail: `Plate: ${d.license_plate || 'EV-REG-01'} • Contact: ${d.phone || 'N/A'}`,
        timestamp: 'GPS Locked',
      })
    })

    // 4. Fetch Customer Saved Addresses from DB with Latitude and Longitude
    const customerAddresses =
      (await prisma.customerAddress?.findMany?.({
        select: {
          id: true,
          label: true,
          address: true,
          latitude: true,
          longitude: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
        take: 25,
      })) || []

    customerAddresses.forEach((addr) => {
      if (addr.latitude != null && addr.longitude != null) {
        pins.push({
          id: `addr_${addr.id}`,
          name: `${addr.label || 'Saved Address'} (${addr.customer?.name || 'Customer'})`,
          type: 'order',
          status: 'Customer Saved Location',
          lat: Number(addr.latitude),
          lng: Number(addr.longitude),
          locationName: addr.address,
          detail: `Saved Address: ${addr.address} • User: ${addr.customer?.name || 'Customer'}`,
          timestamp: 'Saved in DB',
        })
      }
    })

    const openKitchensCount = restaurants.filter((r) => r.is_open).length
    const activeRidersCount = drivers.length
    const activeOrdersCount = inTransitOrders.length

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
}
