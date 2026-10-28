import { useCallback, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
}

export function PullToRefresh({ children, onRefresh, refreshing = false }: PullToRefreshProps) {
  const [pullOffset, setPullOffset] = useState(0)
  const [active, setActive] = useState(false)
  const startY = useRef(0)
  const THRESHOLD = 70

  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
    setActive(true)
    setPullOffset(0)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!active) return
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop > 0) {
      setActive(false)
      setPullOffset(0)
      return
    }
    const y = e.touches[0].clientY
    const delta = y - startY.current
    if (delta <= 0) {
      setPullOffset(0)
      return
    }
    const offset = Math.min(delta * 0.5, 140)
    setPullOffset(offset)
    if (offset > 6) e.preventDefault()
  }

  const onTouchEnd = useCallback(async () => {
    if (!active) return
    setActive(false)
    const off = pullOffset
    setPullOffset(0)
    if (off >= THRESHOLD && onRefresh && !refreshing) {
      await onRefresh()
    }
  }, [active, pullOffset, onRefresh, refreshing])

  const stretch = refreshing ? THRESHOLD : pullOffset
  const showIndicator = refreshing || pullOffset > 10

  return (
    <div
      className="ptr-scroll"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ maxHeight: `calc(100dvh - var(--nav-height))` }}
    >
      <div
        className="ptr-indicator"
        style={{
          transform: refreshing ? 'translateY(0)' : `translateY(calc(-100% + ${pullOffset}px))`,
          opacity: refreshing ? 1 : Math.min(pullOffset / 30, 1),
          transition: refreshing
            ? 'none'
            : 'transform 0.25s cubic-bezier(0, 0, 0.2, 1), opacity 0.15s ease',
        }}
      >
        <Loader2 className="ptr-spinner" />
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
