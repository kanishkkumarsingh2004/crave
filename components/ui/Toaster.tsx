'use client'

import { useToast, type Toast } from '@/lib/toast-context'
import { AlertCircle, Check, Info, X } from 'lucide-react'
import React from 'react'

// ─── Visual config per variant ────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  Toast['variant'],
  {
    iconBadge: React.ReactNode
    accentBorder: string
    glow: string
  }
> = {
  success: {
    iconBadge: (
      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30">
        <Check className="size-3.5 stroke-[3]" />
      </div>
    ),
    accentBorder: 'border-emerald-500/30',
    glow: 'shadow-[0_8px_24px_rgba(52,199,89,0.15)]',
  },
  error: {
    iconBadge: (
      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
        <AlertCircle className="size-3.5 stroke-[2.5]" />
      </div>
    ),
    accentBorder: 'border-rose-500/30',
    glow: 'shadow-[0_8px_24px_rgba(244,63,94,0.15)]',
  },
  info: {
    iconBadge: (
      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-[#d9f447]/20 text-[#d9f447] border border-[#d9f447]/30">
        <Info className="size-3.5 stroke-[2.5]" />
      </div>
    ),
    accentBorder: 'border-[#d9f447]/30',
    glow: 'shadow-[0_8px_24px_rgba(217,244,71,0.15)]',
  },
}

// ─── Single Apple-grade Toast Item ───────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = VARIANT_CONFIG[toast.variant]

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={onDismiss}
      className={`
        pointer-events-auto group relative flex items-center gap-2.5 overflow-hidden
        rounded-full pl-2.5 pr-2 py-2
        bg-[#121815]/95 dark:bg-[#121815]/95 backdrop-blur-2xl text-white
        border border-white/15 dark:border-white/20
        shadow-[0_12px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]
        ${config.glow}
        animate-in fade-in slide-in-from-top-3 zoom-in-95 duration-200
        cursor-pointer active:scale-98 transition-all
        max-w-[92vw] sm:max-w-[380px]
      `}
    >
      {/* Icon Badge */}
      {config.iconBadge}

      {/* Toast Message */}
      <p className="text-xs font-semibold leading-tight text-white/95 truncate max-w-[220px] sm:max-w-[270px]">
        {toast.message}
      </p>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        aria-label="Dismiss notification"
        className="grid size-6 shrink-0 place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────
// Mobile  : Centered pill at top-3 (doesn't stretch to 100% full screen)
// Desktop : Positioned smoothly at top-5 right-6

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  // Always show only the latest toast to prevent screen-covering clusters
  const currentToast = toasts[toasts.length - 1]

  return (
    <div
      aria-label="Notifications"
      className="
        pointer-events-none fixed z-[9999]
        top-3 left-1/2 -translate-x-1/2
        sm:top-5 sm:right-6 sm:left-auto sm:translate-x-0
        flex flex-col items-center sm:items-end
      "
    >
      <ToastItem toast={currentToast} onDismiss={() => dismiss(currentToast.id)} />
    </div>
  )
}
