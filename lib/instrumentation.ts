/**
 * lib/instrumentation.ts
 *
 * Structured request timing telemetry (Phase P2-A of Stability Plan).
 * Measures auth, DB, processing, and total execution time.
 * Emits a single clean JSON line for observability without logging sensitive payloads.
 */

export async function withTiming<T>(
  routeId: string,
  fn: (mark: (label: string) => void) => Promise<T>
): Promise<T> {
  const t0 = performance.now()
  const marks: Record<string, number> = {}
  let lastMark = t0

  const mark = (label: string) => {
    const now = performance.now()
    marks[label] = Math.round(now - lastMark)
    lastMark = now
  }

  try {
    return await fn(mark)
  } finally {
    const totalMs = Math.round(performance.now() - t0)
    if (process.env.ENABLE_ROUTE_TIMING === 'true') {
      console.info(JSON.stringify({ route: routeId, ...marks, totalMs }))
    }
  }
}
