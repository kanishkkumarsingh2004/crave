import crypto from 'node:crypto'
import { releaseDriverLock } from '@/lib/dispatch/atomic-lock'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { sendDriverPushToUsers } from '@/lib/notifications/driver-push'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'

const MAX_OFFER_TTL_SECONDS = 300
const MAX_BATCH_SIZE = 20

export class DispatchRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

export async function createDispatchOffers(params: {
  orderId: string
  vehicleType?: string
  batchSize?: number
  offerTtlSeconds?: number
}) {
  const orderId = params.orderId.trim()
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      restaurant_name: true,
      status: true,
      payment_status: true,
      rider_id: true,
      restaurant: { select: { latitude: true, longitude: true } },
      dispatch_offers: {
        where: { status: 'pending', expires_at: { gt: new Date() } },
        select: { dispatch_attempt_id: true, driver_id: true, expires_at: true },
      },
    },
  })
  if (!order) throw new DispatchRequestError('Order not found', 404)
  if (
    order.payment_status !== 'verified' ||
    order.status !== 'ready_for_pickup' ||
    order.rider_id
  ) {
    throw new DispatchRequestError(
      'Dispatch requires a verified order that is ready for pickup and unassigned',
      409
    )
  }

  const existingOffer = order.dispatch_offers[0]
  if (existingOffer) {
    const recipientDriverIds = order.dispatch_offers.map((offer) => offer.driver_id)
    const safeOffer = {
      id: order.id,
      orderId: order.id,
      restaurantName: order.restaurant_name,
      status: order.status,
      offerExpiresAt: existingOffer.expires_at.getTime(),
    }
    await broadcast('driver_offers', {
      type: 'dispatch_offer',
      offer: safeOffer,
      recipientDriverIds,
    })
    await sendDriverPushToUsers(recipientDriverIds, {
      title: 'New delivery offer',
      body: `Pickup available from ${order.restaurant_name}`,
      orderId: order.id,
      type: 'dispatch_offer',
      route: 'offers',
    }).catch((error) => console.warn('[dispatch] Driver push retry failed:', error))
    return {
      success: true,
      message: 'Dispatch offers already active for this order',
      requestId: order.id,
      alertsSentCount: recipientDriverIds.length,
      dispatchAttemptId: existingOffer.dispatch_attempt_id,
      idempotent: true,
    }
  }

  const storedLatitude = order.restaurant?.latitude
  const storedLongitude = order.restaurant?.longitude
  const pickupLat = Number(storedLatitude)
  const pickupLng = Number(storedLongitude)
  if (
    storedLatitude == null ||
    storedLongitude == null ||
    !Number.isFinite(pickupLat) ||
    pickupLat < -90 ||
    pickupLat > 90 ||
    !Number.isFinite(pickupLng) ||
    pickupLng < -180 ||
    pickupLng > 180
  ) {
    throw new DispatchRequestError(
      'Invalid coordinates: pickupLat must be -90..90 and pickupLng -180..180',
      400
    )
  }

  const batchSize = Math.min(
    Number.isInteger(params.batchSize) && Number(params.batchSize) > 0
      ? Number(params.batchSize)
      : 3,
    MAX_BATCH_SIZE
  )
  const offerTtlSeconds = Math.min(
    Number.isInteger(params.offerTtlSeconds) && Number(params.offerTtlSeconds) > 0
      ? Number(params.offerTtlSeconds)
      : 15,
    MAX_OFFER_TTL_SECONDS
  )

  const searchResult = await findGeofencedCandidateDrivers({
    requestId: order.id,
    pickupLat,
    pickupLng,
    requiredVehicleType: params.vehicleType,
    minCandidatesRequired: batchSize,
    offerTtlSeconds,
  })
  const selectedCandidates = searchResult.eligibleCandidates.slice(0, batchSize)
  const unusedCandidates = searchResult.eligibleCandidates.slice(batchSize)
  await Promise.allSettled(
    unusedCandidates.map((candidate) => releaseDriverLock(candidate.driverId, order.id))
  )

  if (selectedCandidates.length === 0) {
    return {
      success: false,
      message: 'No eligible candidate drivers found in H3 search radius',
      requestId: order.id,
      pickupH3Cell: searchResult.pickupH3Cell,
      stageFound: searchResult.stageFound,
      alertsSentCount: 0,
      candidates: [],
    }
  }

  const candidateIds = selectedCandidates.map((candidate) => candidate.driverId)
  const dispatchAttemptId = crypto.randomUUID()
  const offerExpiresAt = new Date(Date.now() + offerTtlSeconds * 1000)

  try {
    await prisma.$transaction([
      prisma.dispatchOffer.updateMany({
        where: { order_id: order.id, status: 'pending' },
        data: { status: 'cancelled' },
      }),
      prisma.dispatchOffer.createMany({
        data: candidateIds.map((driverId) => ({
          id: crypto.randomUUID(),
          order_id: order.id,
          driver_id: driverId,
          dispatch_attempt_id: dispatchAttemptId,
          status: 'pending',
          expires_at: offerExpiresAt,
        })),
      }),
    ])
  } catch (error) {
    await Promise.allSettled(candidateIds.map((driverId) => releaseDriverLock(driverId, order.id)))
    throw error
  }

  const safeOffer = {
    id: order.id,
    orderId: order.id,
    restaurantName: order.restaurant_name,
    status: order.status,
    offerExpiresAt: offerExpiresAt.getTime(),
  }
  await broadcast('driver_offers', {
    type: 'dispatch_offer',
    offer: safeOffer,
    recipientDriverIds: candidateIds,
  })
  await sendDriverPushToUsers(candidateIds, {
    title: 'New delivery offer',
    body: `Pickup available from ${order.restaurant_name}`,
    orderId: order.id,
    type: 'dispatch_offer',
    route: 'offers',
  }).catch((error) => console.warn('[dispatch] Driver push failed:', error))

  return {
    success: true,
    message: `Pickup dispatch alert routed to ${candidateIds.length} H3 candidates`,
    requestId: order.id,
    pickupH3Cell: searchResult.pickupH3Cell,
    stageFound: searchResult.stageFound,
    alertsSentCount: candidateIds.length,
    dispatchAttemptId,
  }
}
