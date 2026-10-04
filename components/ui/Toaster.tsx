'use client'

import { useToast, type Toast } from '@/lib/toast-context'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

// ─── Visual config per variant ────────────────────────────────────────────────

const VARIANT_STYLES: Record<
  Toast['variant'],
  { container: string; icon: React.ReactNode; bar: string }
> = {
  success: {
    container: 'bg-[#18201c] text-white border border-white/10',
    icon: <CheckCircle2 className="size-4 shrink-0 text-[#d9f447]" />,
    bar: 'bg-[#d9f447]',
  },
  error: {
    container: 'bg-rose-700 text-white border border-rose-500/40',
    icon: <AlertCircle className="size-4 shrink-0 text-white" />,
    bar: 'bg-rose-300',
  },
  info: {
    container: 'bg-[#1e2d26] text-white border border-white/10',
    icon: <Info className="size-4 shrink-0 text-[#d9f447]" />,
    bar: 'bg-[#d9f447]/60',
  },
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const { container, icon, bar } = VARIANT_STYLES[toast.variant]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative flex w-full max-w-[340px] items-start gap-3 overflow-hidden
        rounded-2xl px-4 py-3 shadow-2xl
        animate-in fade-in slide-in-from-top-3 duration-300
        ${container}
      `}
    >
      {icon}
      <p className="flex-1 text-xs font-semibold leading-snug">{toast.message}</p>
      {/* progress bar */}
      <span
        className={`absolute bottom-0 left-0 h-[2px] rounded-full ${bar} animate-[shrink_3.5s_linear_forwards]`}
        style={{ width: '100%' }}
      />
    </div>
  )
}

// ─── Container — position differs by breakpoint ───────────────────────────────
// Mobile  : top-center  (slides down from top)
// ≥ sm    : top-right   (slides in from top-right)

export function Toaster() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="
        pointer-events-none fixed z-[9999]
        top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)]
        sm:left-auto sm:right-5 sm:translate-x-0 sm:w-auto sm:min-w-[300px] sm:max-w-[360px]
        flex flex-col items-stretch gap-2
      "
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
