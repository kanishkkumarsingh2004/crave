/**
 * Realtime Event Bus & SSE Broadcaster
 *
 * Provides event subscription and broadcast mechanism for order status updates,
 * driver location tracking, and delivery progress.
 */

import { EventEmitter } from "events";

export interface RealtimeEvent {
  type: "ORDER_STATUS_CHANGED" | "DRIVER_LOCATION_UPDATED" | "DELIVERY_ASSIGNMENT_OFFERED";
  targetUserId?: string;
  orderId?: string;
  deliveryId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

class RealtimeEventBus extends EventEmitter {
  public broadcast(event: RealtimeEvent) {
    this.emit("realtime-event", event);
  }
}

export const realtimeBus = new RealtimeEventBus();
// Increase listener cap for SSE connections
realtimeBus.setMaxListeners(500);

export function broadcastOrderUpdate(
  orderId: string,
  status: string,
  payload: Record<string, unknown> = {},
) {
  realtimeBus.broadcast({
    type: "ORDER_STATUS_CHANGED",
    orderId,
    payload: { status, ...payload },
    timestamp: new Date().toISOString(),
  });
}

export function broadcastDriverLocation(
  driverId: string,
  deliveryId: string | undefined,
  latitude: number,
  longitude: number,
) {
  realtimeBus.broadcast({
    type: "DRIVER_LOCATION_UPDATED",
    deliveryId,
    payload: { driverId, latitude, longitude },
    timestamp: new Date().toISOString(),
  });
}
