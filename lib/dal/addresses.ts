/**
 * Database Access Layer — Customer Addresses
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface CustomerAddressDTO {
  id: string
  customer_id: string
  label: string
  address: string
  is_default: boolean
  latitude: number | null
  longitude: number | null
  created_at?: Date | string
}

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddressDTO[]> {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
    })
    return addresses.map((addr) => ({
      id: addr.id,
      customer_id: addr.customer_id,
      label: addr.label,
      address: addr.address,
      is_default: addr.is_default,
      latitude: addr.latitude != null ? Number(addr.latitude) : null,
      longitude: addr.longitude != null ? Number(addr.longitude) : null,
      created_at: addr.created_at,
    }))
  } catch (err) {
    console.error('[getCustomerAddresses error]', err)
    return []
  }
}

async function resolveCoordinates(
  address: string,
  lat?: number | null,
  lng?: number | null
): Promise<{ lat: number; lng: number }> {
  if (lat != null && !isNaN(lat) && lng != null && !isNaN(lng)) {
    return { lat, lng }
  }

  // Attempt forward geocoding if online
  if (address && typeof address === 'string' && address.trim()) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'CraveDeliveryPlatform/1.0 (support@crave.app)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(2500),
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json) && json.length > 0 && json[0].lat && json[0].lon) {
          const parsedLat = parseFloat(json[0].lat)
          const parsedLng = parseFloat(json[0].lon)
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            return { lat: parsedLat, lng: parsedLng }
          }
        }
      }
    } catch {}
  }

  // Default fallback coordinates (Bengaluru central coordinates)
  return { lat: 12.9716, lng: 77.5946 }
}

export async function createCustomerAddress(data: {
  customer_id: string
  label: string
  address: string
  latitude?: number | null
  longitude?: number | null
  is_default?: boolean
}): Promise<CustomerAddressDTO> {
  const isDefault = Boolean(data.is_default)
  const id = crypto.randomUUID()

  const coords = await resolveCoordinates(data.address, data.latitude, data.longitude)
  const finalLat = coords.lat
  const finalLng = coords.lng

  if (isDefault) {
    try {
      await prisma.customerAddress.updateMany({
        where: { customer_id: data.customer_id },
        data: { is_default: false },
      })
    } catch {}
  }

  const created = await prisma.customerAddress.create({
    data: {
      id,
      customer_id: data.customer_id,
      label: data.label,
      address: data.address,
      is_default: isDefault,
      latitude: new Prisma.Decimal(finalLat),
      longitude: new Prisma.Decimal(finalLng),
    },
  })

  // Update primary user address in users table
  try {
    await prisma.user.update({
      where: { id: data.customer_id },
      data: { address: data.address },
    })
  } catch {}

  return {
    id: created.id,
    customer_id: created.customer_id,
    label: created.label,
    address: created.address,
    is_default: created.is_default,
    latitude: created.latitude != null ? Number(created.latitude) : finalLat,
    longitude: created.longitude != null ? Number(created.longitude) : finalLng,
    created_at: created.created_at,
  }
}

export async function updateCustomerAddress(data: {
  id: string
  customer_id: string
  label?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  is_default?: boolean
}): Promise<CustomerAddressDTO | null> {
  try {
    const existing = await prisma.customerAddress.findFirst({
      where: { id: data.id, customer_id: data.customer_id },
    })

    if (!existing) {
      return null
    }

    let lat = existing.latitude != null ? Number(existing.latitude) : null
    let lng = existing.longitude != null ? Number(existing.longitude) : null

    if (data.latitude != null && data.longitude != null) {
      lat = data.latitude
      lng = data.longitude
    } else if (data.address && data.address !== existing.address) {
      const coords = await resolveCoordinates(data.address, data.latitude, data.longitude)
      lat = coords.lat
      lng = coords.lng
    }

    if (data.is_default) {
      await prisma.customerAddress.updateMany({
        where: { customer_id: data.customer_id },
        data: { is_default: false },
      })
    }

    const updated = await prisma.customerAddress.update({
      where: { id: data.id },
      data: {
        label: data.label !== undefined ? data.label : existing.label,
        address: data.address !== undefined ? data.address : existing.address,
        is_default: data.is_default !== undefined ? data.is_default : existing.is_default,
        latitude: lat != null ? new Prisma.Decimal(lat) : existing.latitude,
        longitude: lng != null ? new Prisma.Decimal(lng) : existing.longitude,
      },
    })

    if (data.is_default || updated.is_default) {
      try {
        await prisma.user.update({
          where: { id: data.customer_id },
          data: { address: updated.address },
        })
      } catch {}
    }

    return {
      id: updated.id,
      customer_id: updated.customer_id,
      label: updated.label,
      address: updated.address,
      is_default: updated.is_default,
      latitude: updated.latitude != null ? Number(updated.latitude) : lat,
      longitude: updated.longitude != null ? Number(updated.longitude) : lng,
      created_at: updated.created_at,
    }
  } catch (err) {
    console.error('[updateCustomerAddress error]', err)
    return null
  }
}

export async function setDefaultAddress(id: string, customerId: string): Promise<boolean> {
  try {
    const existing = await prisma.customerAddress.findFirst({
      where: { id, customer_id: customerId },
    })
    if (!existing) return false

    await prisma.customerAddress.updateMany({
      where: { customer_id: customerId },
      data: { is_default: false },
    })

    await prisma.customerAddress.update({
      where: { id },
      data: { is_default: true },
    })

    try {
      await prisma.user.update({
        where: { id: customerId },
        data: { address: existing.address },
      })
    } catch {}

    return true
  } catch (err) {
    console.error('[setDefaultAddress error]', err)
    return false
  }
}

export async function deleteCustomerAddress(id: string, customerId: string): Promise<boolean> {
  try {
    const result = await prisma.customerAddress.deleteMany({
      where: { id, customer_id: customerId },
    })
    return result.count > 0
  } catch (err) {
    console.error('[deleteCustomerAddress error]', err)
    return false
  }
}

