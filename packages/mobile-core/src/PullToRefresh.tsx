import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const REFRESH_THRESHOLD = 70
const MAX_PULL = 140
const DIRECTION_SLOP = 6

export function calculatePullOffset(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): number {
  const deltaX = currentX - startX
  const deltaY = currentY - startY
  if (deltaY <= 0 || (Math.abs(deltaX) > DIRECTION_SLOP && Math.abs(deltaX) > deltaY)) return 0
  return Math.min(deltaY * 0.5, MAX_PULL)
}

export interface PullToRefreshProps {
  children: ReactNode
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
  className?: string
}

/**
 * Touch-safe pull to refresh for the app's single vertical scroll owner.
 *
 * The gesture only claims a downward, predominantly vertical drag from the
 * top. Browsers may switch a touchmove to non-cancelable once native scrolling
 * starts, so preventDefault is deliberately guarded by event.cancelable.
 */
export function PullToRefresh({
  children,
  onRefresh,
  refreshing = false,
  className = '',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const activeRef = useRef(false)
  const offsetRef = useRef(0)
  const refreshRef = useRef(onRefresh)
  const refreshingRef = useRef(refreshing)
  const [pullOffset, setPullOffset] = useState(0)

  refreshRef.current = onRefresh
  refreshingRef.current = refreshing

  const reset = useCallback(() => {
    activeRef.current = false
    offsetRef.current = 0
    setPullOffset(0)
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1 || element.scrollTop > 0) {
        reset()
        return
      }

      const touch = event.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      activeRef.current = true
      offsetRef.current = 0
      setPullOffset(0)
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!activeRef.current || event.touches.length !== 1) return
      if (element.scrollTop > 0) {
        reset()
        return
      }

      const touch = event.touches[0]
      const nextOffset = calculatePullOffset(
        startXRef.current,
        startYRef.current,
        touch.clientX,
        touch.clientY
      )

      if (nextOffset === 0) {
        reset()
        return
      }

      offsetRef.current = nextOffset
      setPullOffset(nextOffset)

      if (nextOffset > DIRECTION_SLOP && event.cancelable) event.preventDefault()
    }

    const onTouchEnd = () => {
      if (!activeRef.current) return
      const shouldRefresh =
        offsetRef.current >= REFRESH_THRESHOLD &&
        Boolean(refreshRef.current) &&
        !refreshingRef.current
      reset()
      if (shouldRefresh) void Promise.resolve(refreshRef.current?.()).catch(() => undefined)
    }

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd, { passive: true })
    element.addEventListener('touchcancel', reset, { passive: true })

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', reset)
    }
  }, [reset])

  const stretch = refreshing ? REFRESH_THRESHOLD : pullOffset
  const showIndicator = refreshing || pullOffset > 10

  return (
    <div
      ref={containerRef}
      className={`ptr-scroll${className ? ` ${className}` : ''}`}
      data-pull-active={pullOffset > 0 || undefined}
    >
      <div
        className="ptr-indicator"
        role="status"
        aria-live="polite"
        aria-hidden={!showIndicator}
        style={{
          transform: refreshing ? 'translateY(0)' : `translateY(calc(-100% + ${pullOffset}px))`,
          opacity: refreshing ? 1 : Math.min(pullOffset / 30, 1),
          transition: refreshing
            ? 'none'
            : 'transform 0.25s cubic-bezier(0, 0, 0.2, 1), opacity 0.15s ease',
        }}
      >
        <span className="ptr-spinner" aria-hidden="true" />
        <span>{refreshing ? 'Refreshing…' : 'Pull to refresh'}</span>
      </div>
      <div
        className="ptr-stretch"
        style={{
          transform: `translateY(${stretch}px)`,
          transition: refreshing ? 'none' : 'transform 0.25s cubic-bezier(0, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
