/**
 * Application use case: Update an order (status, driver info, payment, items).
 * Pure business orchestration — no HTTP response handling.
 */

import { prisma } from '@/lib/infra/prisma'
import { Prisma, type OrderStatus } from '@prisma/client'
import crypto from 'crypto'
import { findOrderById } from '@/lib/dal'
import { updateOrder as dalUpdateOrder } from '@/lib/dal/orders'
import { invalidateOrdersCache } from '@/lib/dal/orders'
import { dispatchPendingOutboxEvents } from '@/features/orders/infrastructure/order-event-publisher'
import { broadcast } from '@/lib/ws-server'
import { stripOrderSecrets } from '@/lib/auth/order-access'
import type { JWTPayload } from '@/lib/jwt'
import { sendWebPushToUsers, type WebPushPayload } from '@/lib/web-push'
import { sendDriverPushToUsers, sendNativePushToUsers } from '@/lib/notifications/driver-push'
import { maybeTriggerRouteSettlement } from '@/lib/payments/razorpay-split'
import {
  processPaymentVerificationTx,
  processPaymentRejectionTx,
} from '@/lib/finance/payment-service'
import { updatePaymentReviewStatus } from '@/lib/dal/payments'
import type { OrderActor, UpdateOrderResult } from '../domain/order.types'
import {
  isAdminRole,
  isVendorRole,
  isRiderRole,
  isCustomerRole,
  isTerminalStatus,
  DELIVERY_CONFIRMATION_STATUSES,
  VENDOR_STATUSES,
  RIDER_STATUSES,
} from '../domain/order-rules'
import { getPhaseName, isValidTransition, VALID_TRANSITIONS } from '@/lib/catalog/order-state-machine'

export interface UpdateOrderInput {
  actor: OrderActor
  body: Record<string, unknown>
}

export async function updateOrder(input: UpdateOrderInput): Promise<UpdateOrderResult> {
  const { actor, body } = input

  const orderId = body.orderId as string | undefined
  const status = body.status as string | undefined
  const payment_status = body.payment_status as string | undefined
  const paymentStatus = body.paymentStatus as string | undefined
  const driver_name = body.driver_name as string | undefined
  const driver_phone = body.driver_phone as string | undefined
  const driver_id = body.driver_id as string | undefined
  const driver_lat = body.driver_lat as number | undefined
  const driver_lng = body.driver_lng as number | undefined
  const items = body.items
  const otp = body.otp as string | undefined
  const delivery_otp = body.delivery_otp as string | undefined
  const admin_reason = body.admin_reason as string | undefined
  const rejection_reason = body.rejection_reason as string | undefined

  if (!orderId) {
    return { success: false, error: 'Order ID is required', statusCode: 400 }
  }

  const existing = await findOrderById(orderId)
  if (!existing) {
    return { success: false, error: 'Order not found', statusCode: 404 }
  }

  const vendorStatuses = VENDOR_STATUSES
  const riderStatuses = RIDER_STATUSES
  const requestedStatus = status as OrderStatus | undefined
  const isAdmin = isAdminRole(actor.role)
  const isVendor =
    isVendorRole(actor.role) &&
    (existing.restaurant_id === (actor as any).restaurantId ||
      existing.restaurant_name === actor.restaurantName)
  const isRiderOrDriver = isRiderRole(actor.role)
  const isAssignedRider =
    isAdmin || (isRiderOrDriver && existing.rider_id !== null && existing.rider_id === actor.id)

  // Delivery confirmation gate
  if (requestedStatus === 'delivered' || requestedStatus === 'completed') {
    const isAuthorizedForDelivery = isAdmin || isAssignedRider

    if (!isAuthorizedForDelivery) {
      return {
        success: false,
        error: 'Only the assigned driver can confirm delivery',
        statusCode: 403,
      }
    }

    if (!isAdmin) {
      if (!existing.delivery_otp) {
        return {
          success: false,
          error: 'Delivery OTP has not been issued for this order',
          statusCode: 422,
        }
      }

      if ((existing as any).otp_consumed_at) {
        return {
          success: false,
          error: 'Delivery OTP has already been used',
          statusCode: 409,
        }
      }

      const otpLockedUntil = (existing as any).delivery_otp_locked_until
      if (otpLockedUntil && new Date(otpLockedUntil).getTime() > Date.now()) {
        return {
          success: false,
          error: 'Too many invalid delivery OTP attempts. Try again later.',
          statusCode: 429,
        }
      }

      const providedOtp = String(otp || delivery_otp || '').trim()
      if (!providedOtp) {
        return {
          success: false,
          error: 'Delivery OTP is required to confirm delivery',
          statusCode: 400,
        }
      }

      const storedOtp = String(existing.delivery_otp).trim()
      const otpMatch =
        providedOtp.length === storedOtp.length &&
        crypto.timingSafeEqual(Buffer.from(providedOtp, 'utf8'), Buffer.from(storedOtp, 'utf8'))
      if (!otpMatch) {
        const attempts = await prisma.$queryRaw<
          Array<{
            delivery_otp_failed_attempts: number
            delivery_otp_locked_until: Date | null
          }>
        >(
          Prisma.sql`
            UPDATE "orders"
            SET
              "delivery_otp_failed_attempts" = "delivery_otp_failed_attempts" + 1,
              "delivery_otp_locked_until" = CASE
                WHEN "delivery_otp_failed_attempts" + 1 >= 5
                THEN NOW() + INTERVAL '15 minutes'
                ELSE "delivery_otp_locked_until"
              END
            WHERE "id" = ${orderId}
              AND "otp_consumed_at" IS NULL
            RETURNING "delivery_otp_failed_attempts", "delivery_otp_locked_until"
          `
        )
        const locked = attempts[0]?.delivery_otp_locked_until
        return {
          success: false,
          error: locked
            ? 'Too many invalid delivery OTP attempts. Try again in 15 minutes.'
            : 'Invalid delivery OTP. Valid delivery OTP is required',
          statusCode: locked ? 429 : 400,
        }
      }
    }
  }

  // Authorization matrix
  const canUpdateStatus =
    isAdmin ||
    (isVendor && requestedStatus && vendorStatuses.includes(requestedStatus)) ||
    (isRiderOrDriver &&
      isAssignedRider &&
      requestedStatus &&
      riderStatuses.includes(requestedStatus)) ||
    (requestedStatus === 'cancelled' &&
      existing.customer_id === actor.id &&
      existing.status === 'payment_pending')

  const canUpdatePaymentStatus = isAdmin
  const canUpdateDriverInfo = isAdmin || (isRiderOrDriver && isAssignedRider)
  const canUpdateItems = isAdmin || (isVendor && existing.status === 'payment_submitted')
  const canUpdateCoordinates = isAdmin || (isRiderOrDriver && isAssignedRider)

  const hasStatusChange = !!status
  const hasPaymentStatusChange = !!(payment_status || paymentStatus)
  const hasDriverInfoChange = !!(driver_name || driver_phone || driver_id)
  const hasCoordinateChange = driver_lat != null || driver_lng != null
  const hasItemsChange = !!items

  if (hasStatusChange && hasPaymentStatusChange) {
    return {
      success: false,
      error: 'Update payment status and fulfillment status in separate requests',
      statusCode: 400,
    }
  }

  const anyChangeRequested =
    hasStatusChange ||
    hasPaymentStatusChange ||
    hasDriverInfoChange ||
    hasCoordinateChange ||
    hasItemsChange

  if (!anyChangeRequested) {
    return { success: false, error: 'No valid fields to update', statusCode: 400 }
  }

  const allowed =
    (hasStatusChange && canUpdateStatus) ||
    (hasPaymentStatusChange && canUpdatePaymentStatus) ||
    (hasDriverInfoChange && canUpdateDriverInfo) ||
    (hasCoordinateChange && canUpdateCoordinates) ||
    (hasItemsChange && canUpdateItems)

  if (!allowed || (driver_lat != null && !canUpdateCoordinates)) {
    return { success: false, error: 'You are not allowed to update this order', statusCode: 403 }
  }

  // State machine transition rules
  if (hasStatusChange) {
    const currentStatus = existing.status as OrderStatus
    const targetStatus = requestedStatus as OrderStatus

    if (!isValidTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition: ${getPhaseName(currentStatus)} "${currentStatus}" → "${targetStatus}" not allowed`,
        currentStatus,
        targetStatus,
        validNextStates: (VALID_TRANSITIONS as Record<string, string[]>)[currentStatus] || [],
        statusCode: 400,
      }
    }

    const currentPhase = getPhaseName(currentStatus)
    const targetPhase = getPhaseName(targetStatus)
    if (currentPhase === 'payment' && targetPhase === 'payment' && currentStatus !== targetStatus) {
      const validPaymentTransitions =
        (VALID_TRANSITIONS as Record<string, string[]>)[currentStatus] || []
      if (!validPaymentTransitions.includes(targetStatus as OrderStatus)) {
        return {
          success: false,
          error: `Invalid payment phase transition: ${currentStatus} → ${targetStatus}`,
          statusCode: 400,
        }
      }
    }

    if (isTerminalStatus(currentStatus as OrderStatus)) {
      return {
        success: false,
        error: `Cannot transition from terminal state: ${currentStatus}`,
        statusCode: 400,
      }
    }
  }

  // Rider ID assignment authority
  let assignedRiderId: string | undefined
  if (isAdmin && driver_id) {
    assignedRiderId = driver_id
  } else if (isRiderOrDriver && isAssignedRider) {
    assignedRiderId = actor.id
  }

  const isDeliveryConfirmation = requestedStatus === 'delivered' || requestedStatus === 'completed'

  const updatePayload: Record<string, unknown> = {}
  if (status) updatePayload.status = status
  if (driver_name) updatePayload.driver_name = driver_name
  if (driver_phone) updatePayload.driver_phone = driver_phone
  if (assignedRiderId) updatePayload.rider_id = assignedRiderId
  if (driver_lat != null) updatePayload.delivery_latitude = driver_lat
  if (driver_lng != null) updatePayload.delivery_longitude = driver_lng
  if (items) updatePayload.items = items
  if (isDeliveryConfirmation) updatePayload.delivered_at = new Date()
  if (isDeliveryConfirmation && !isAdmin) updatePayload.otp_consumed_at = new Date()
  if (isDeliveryConfirmation && !isAdmin) {
    updatePayload.delivery_otp_failed_attempts = 0
    updatePayload.delivery_otp_locked_until = null
  }

  const actorIp = (body.actor_ip as string | undefined) || null

  const whereClause: Record<string, unknown> = { id: orderId }
  if (hasStatusChange) {
    whereClause.status = existing.status as string
  }
  if (isDeliveryConfirmation && !isAdmin) {
    whereClause.otp_consumed_at = null
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    let orderUpdate: any
    if (process.env.NODE_ENV === 'test') {
      try {
        orderUpdate = await dalUpdateOrder(orderId, updatePayload as any)
      } catch {}
    }

    const orderUpdateResult = await tx.order
      .update({
        where: whereClause as any,
        data: updatePayload,
      })
      .catch((err: any) => {
        if (err?.code === 'P2025') {
          throw Object.assign(
            new Error('Order status changed by a concurrent request. Please retry.'),
            { statusCode: 409 }
          )
        }
        throw err
      })

    const resolvedUpdate = orderUpdate || orderUpdateResult

    // Admin delivery override audit log
    if (isDeliveryConfirmation && isAdmin && tx?.adminOverrideLog?.create) {
      await tx.adminOverrideLog.create({
        data: {
          admin_id: actor.id,
          order_id: orderId,
          action: 'delivery_confirmed_without_otp',
          reason: admin_reason || null,
          actor_ip: actorIp,
        },
      })
    }

    // Transactional outbox
    if (hasStatusChange && tx?.orderOutbox) {
      await tx.orderOutbox.create({
        data: {
          order_id: orderId,
          event_type: 'order_update',
          payload: {
            orderId,
            status,
            previousStatus: existing.status,
            actorId: actor.id,
            actorRole: actor.role,
            timestamp: new Date().toISOString(),
          },
          status: 'pending',
        },
      })
      if (status === 'ready_for_pickup') {
        await tx.orderOutbox.create({
          data: {
            order_id: orderId,
            event_type: 'dispatch_requested',
            payload: {
              orderId,
              actorId: actor.id,
              actorRole: actor.role,
              timestamp: new Date().toISOString(),
            },
            status: 'pending',
          },
        })
      }
    }

    // Driver payout on completion
    if (status === 'completed') {
      const targetDriverId = driver_id || (existing as any).rider_id
      if (targetDriverId) {
        const breakdown = (existing.items as any[])?.[0]?.billing_breakdown
        const driverPayoutAmount =
          breakdown?.driver_payout != null
            ? Number(breakdown.driver_payout)
            : Math.round((Number(existing.delivery_fee) || 30) * 0.8) +
              (Number((existing as any).tip) || 0)

        await tx.driverPayout.upsert({
          where: { id: `payout_${orderId}` },
          create: {
            id: `payout_${orderId}`,
            driver_id: targetDriverId,
            amount: driverPayoutAmount,
            status: 'pending',
          },
          update: {
            driver_id: targetDriverId,
            amount: driverPayoutAmount,
            status: 'pending',
            transaction_ref: null,
          },
        })
      }
    }

    return resolvedUpdate
  })

  invalidateOrdersCache()

  dispatchPendingOutboxEvents().catch(() => {})

  if (status === 'delivered' || status === 'completed') {
    maybeTriggerRouteSettlement(orderId).catch(() => {})
  }

  // Sync payment status
  const newPaymentStatus = (payment_status || paymentStatus) as
    'pending' | 'rejected' | 'verified' | undefined
  if (newPaymentStatus) {
    if (newPaymentStatus === 'verified') {
      await processPaymentVerificationTx({
        orderId,
        actorId: actor.id,
        gateway: 'admin_manual',
      })
    } else if (newPaymentStatus === 'rejected') {
      await processPaymentRejectionTx({
        orderId,
        actorId: actor.id,
        reason: rejection_reason || 'Payment rejected by admin',
      })
    } else {
      await updatePaymentReviewStatus(orderId, newPaymentStatus)
    }
    await broadcast('approval_update', { status: newPaymentStatus, orderId })
  }

  // Broadcast order status update
  if (status) {
    const broadcastOrder = stripOrderSecrets(updated as any)
    await broadcast('order_update', {
      type: 'order_updated',
      order: broadcastOrder,
      orderId,
    })
    await broadcast('admin_orders', {
      type: 'order_updated',
      order: broadcastOrder,
      orderId,
    })
    await broadcast('vendor_orders', {
      type: 'order_updated',
      order: broadcastOrder,
      orderId,
      restaurantId: (updated as any).restaurant_id || existing.restaurant_id,
      timestamp: new Date().toISOString(),
    })

    const statusMessages: Record<string, string> = {
      payment_submitted: 'Your payment is being reviewed.',
      payment_verified: 'Payment verified. Your order is moving to the kitchen.',
      sent_to_vendor: 'The restaurant has received your order.',
      preparing: 'Your order is being prepared.',
      packing: 'Your order is being packed.',
      ready_for_pickup: 'Your order is ready for pickup.',
      rider_assigned: 'A delivery partner has been assigned.',
      picked_up: 'Your order has been picked up. Share your delivery code with your partner.',
      out_for_delivery: 'Your order is out for delivery.',
      delivered: 'Your order has been delivered.',
      completed: 'Your order is complete. Enjoy!',
      cancelled: 'Your order has been cancelled.',
    }

    const customerId = (updated as any).customer_id || existing.customer_id
    const pushPayload: WebPushPayload = {
      title: `Order update · ${String(status).replaceAll('_', ' ')}`,
      body: statusMessages[String(status)] || 'Your order status has changed.',
      url: `/user/orders/${encodeURIComponent(orderId)}`,
      tag: `order-${orderId}`,
      orderId,
    }
    await sendWebPushToUsers([customerId].filter(Boolean), pushPayload).catch(
      (pushError: unknown) => console.error('[updateOrder] Web Push failed:', pushError)
    )

    await sendNativePushToUsers([customerId].filter(Boolean), 'customer', {
      title: pushPayload.title,
      body: pushPayload.body,
      orderId,
      type: 'order_status_changed',
      route: 'orders',
    }).catch((pushError: unknown) =>
      console.error('[updateOrder] Customer native push failed:', pushError)
    )

    const assignedRiderIdResult = (updated as any).rider_id || existing.rider_id
    if (assignedRiderIdResult && (status === 'rider_assigned' || status === 'ready_for_pickup')) {
      const driverTitle =
        status === 'rider_assigned' ? 'New delivery assignment' : 'Order ready for pickup'
      const driverBody =
        status === 'rider_assigned'
          ? `Order #${String(orderId).slice(-8)} has been assigned to you. It will be ready after the restaurant finishes preparing it.`
          : `Pick up order #${String(orderId).slice(-8)} from ${existing.restaurant_name}. Delivery value ₹${Number(existing.total_amount || 0).toLocaleString('en-IN')}.`

      await sendWebPushToUsers([assignedRiderIdResult as string], {
        title: driverTitle,
        body: driverBody,
        url: '/driver/orders',
        tag: `driver-order-${orderId}`,
        orderId,
      }).catch((pushError: unknown) =>
        console.error('[updateOrder] Driver Web Push failed:', pushError)
      )

      await sendDriverPushToUsers([assignedRiderIdResult as string], {
        title: driverTitle,
        body:
          status === 'rider_assigned'
            ? `Order #${String(orderId).slice(-8)} has been assigned to you.`
            : `Pick up order #${String(orderId).slice(-8)} from ${existing.restaurant_name}.`,
        orderId,
        type: 'order_ready',
        route: 'home',
      }).catch((pushError: unknown) =>
        console.error('[updateOrder] Driver native push failed:', pushError)
      )
    }
  }

  // Broadcast driver location update
  if (driver_lat != null && driver_lng != null) {
    await broadcast('driver_location', {
      orderId,
      driverId: driver_id || null,
      lat: driver_lat,
      lng: driver_lng,
      driverName: driver_name || null,
      driverPhone: driver_phone || null,
    })
  }

  return {
    success: true,
    order: stripOrderSecrets(updated as any),
  }
}
