/**
 * Application use case: Cancel/delete an order.
 * Pure business orchestration — no HTTP response handling.
 */

import { deleteOrder } from '@/lib/dal'
import type { OrderActor, CancelOrderResult } from '../domain/order.types'

export interface CancelOrderInput {
  actor: OrderActor
  orderId: string
}

export async function cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
  const { actor, orderId } = input

  const result = await deleteOrder(orderId, actor.id, actor.role)

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to cancel order',
      statusCode: 400,
    }
  }

  return {
    success: true,
    refundQueued: result.refundQueued,
  }
}
