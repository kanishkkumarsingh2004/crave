/**
 * GET /api/v1/realtime/stream — Server-Sent Events (SSE) live event stream endpoint
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/auth";
import { EventEmitter } from "node:events";

const globalBus = globalThis as unknown as { realtimeBus?: EventEmitter };
export const realtimeBus = globalBus.realtimeBus || new EventEmitter();
if (process.env.NODE_ENV !== "production") globalBus.realtimeBus = realtimeBus;

export async function GET(request: NextRequest) {
  const { error } = await withAuth(request);
  if (error) return error;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial heartbeat connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date() })}\n\n`,
        ),
      );

      const listener = (event: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Client disconnected
        }
      };

      realtimeBus.on("realtime-event", listener);

      // Keepalive heartbeat timer every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        realtimeBus.off("realtime-event", listener);
        clearInterval(heartbeatInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
