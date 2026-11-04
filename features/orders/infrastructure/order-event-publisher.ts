/**
 * Infrastructure: Order event publisher.
 *
 * Reads pending events from the transactional order outbox and publishes them
 * across WebSocket / Redis Pub/Sub. Keeps database persistence (DAL) separate
 * from real-time event delivery (infrastructure), per architectural boundary S-04.
 */

import { prisma } from '@/lib/infra/prisma'
import { broadcast } from '@/lib/ws-server'
import { createDispatchOffers } from '@/lib/dispatch/create-dispatch-offers'

/**
 * Dispatches pending outbox events across WebSocket & Redis Pub/Sub,
 * updating outbox statuses atomically in PostgreSQL.
 */
export async function dispatchPendingOutboxEvents(batchSize: number = 25): Promise<number> {
  try {
    const pendingEvents = await prisma.orderOutbox.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
      take: batchSize,
    })

    if (pendingEvents.length === 0) return 0

    let dispatchedCount = 0

    for (const evt of pendingEvents) {
      try {
        const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload
        if (evt.event_type === 'dispatch_requested') {
          const result = await createDispatchOffers({ orderId: evt.order_id })
          if (!result.success) throw new Error(result.message)
        } else {
          await broadcast(evt.event_type, payload)
        }

        await prisma.orderOutbox.update({
          where: { id: evt.id },
          data: {
            status: 'sent',
            processed_at: new Date(),
          },
        })
        dispatchedCount++
      } catch (sendErr: any) {
        await prisma.orderOutbox.update({
          where: { id: evt.id },
          data: {
            attempts: { increment: 1 },
            last_error: sendErr?.message || String(sendErr),
            status: evt.attempts >= 4 ? 'failed' : 'pending',
          },
        })
      }
    }

    return dispatchedCount
  } catch (err) {
    console.warn('[dispatchPendingOutboxEvents] Warning:', err)
    return 0
  }
}
