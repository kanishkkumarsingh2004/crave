/**
 * Application use case: List orders with role-based scoping.
 * Pure business orchestration — no HTTP response handling.
 */

import { listOrders } from '@/lib/dal'
import { sanitizeOrderForActor } from '@/lib/auth/order-access'
import type { JWTPayload } from '@/lib/jwt'
import type { OrderActor, ListOrdersResult } from '../domain/order.types'
import {
  scopeListByActor,
  isVendorRole,
  isAdminRole,
  isCustomerRole,
  isRiderRole,
} from '../domain/order-rules'

export interface ListOrdersInput {
  actor: OrderActor | null
  customerId?: string | null
  vendorId?: string | null
  vendorName?: string | null
  driverId?: string | null
  available?: string | null
}

export async function listOrdersUseCase(input: ListOrdersInput): Promise<ListOrdersResult> {
  const { actor, customerId, vendorId, vendorName, driverId, available } = input

  const scoped = scopeListByActor(actor, {
    customerId: customerId ?? undefined,
    vendorId: vendorId ?? undefined,
    driverId: driverId ?? undefined,
  })

  const isVendorActor = actor ? isVendorRole(actor.role) : false
  const isRiderActor = actor ? isRiderRole(actor.role) : false

  // For non-admin users, require authentication for list operations
  if (!actor && !isVendorActor) {
    return {
      success: false,
      error: 'Authentication required',
      statusCode: 401,
      orders: [],
    }
  }

  const listFilters: Record<string, unknown> = {
    customerId: scoped.customerId,
    restaurantId: scoped.restaurantId,
    restaurantName:
      actor && isAdminRole(actor.role) ? (vendorName as unknown as string | undefined) : undefined,
  }
  if (scoped.driverId) listFilters.driverId = scoped.driverId
  if (scoped.onlyApprovedForVendor !== undefined) {
    listFilters.onlyApprovedForVendor = scoped.onlyApprovedForVendor
  }
  listFilters.includeAvailableForRider =
    isRiderActor || (actor && isAdminRole(actor.role) && Boolean(available as string | null))

  const orders = await listOrders(listFilters as any)

  const sanitizedOrders = orders.map((order) =>
    sanitizeOrderForActor(actor as unknown as JWTPayload, order)
  )

  return { success: true, orders: sanitizedOrders }
}
