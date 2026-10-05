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
      latitude:
        data.latitude != null && !isNaN(data.latitude) ? new Prisma.Decimal(data.latitude) : null,
      longitude:
        data.longitude != null && !isNaN(data.longitude)
          ? new Prisma.Decimal(data.longitude)
          : null,
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
    latitude: created.latitude != null ? Number(created.latitude) : null,
    longitude: created.longitude != null ? Number(created.longitude) : null,
    created_at: created.created_at,
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
