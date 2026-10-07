'use client'

import { AlertCircle, CheckCircle2, Info, ShoppingBag, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

export interface AlertModalConfig {
  isOpen: boolean
  title?: string
  message: string
  variant?: 'warning' | 'info' | 'error' | 'success'
  actionLabel?: string
  actionPath?: string
  onClose: () => void
}

export default function CustomAlertModal({
  isOpen,
  title = 'Order Queue Notice',
  message,
  variant = 'warning',
  actionLabel,
  actionPath,
  onClose,
}: AlertModalConfig) {
  const router = useRouter()

  if (!isOpen) return null

  const handleAction = () => {
    onClose()
    if (actionPath) {
      router.push(actionPath)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121815]/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl border border-[#d9f447]/30 bg-[#121815] p-6 text-white shadow-2xl relative overflow-hidden transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle Background Glow Accent */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-[#d9f447]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-44 rounded-full bg-emerald-500/15 blur-3xl" />

        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition"
          aria-label="Close modal"
        >
          <X className="size-4" />
        </button>

        {/* Icon & Title Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div
            className={`grid size-16 place-items-center rounded-full shadow-lg mb-4 ${
              variant === 'warning'
                ? 'bg-[#d9f447] text-[#121815] shadow-[#d9f447]/20 animate-pulse'
                : variant === 'error'
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : variant === 'success'
                    ? 'bg-emerald-500 text-[#121815] shadow-emerald-500/30'
                    : 'bg-blue-500 text-white shadow-blue-500/30'
            }`}
          >
            {variant === 'warning' && <AlertCircle className="size-8 stroke-[2.5]" />}
            {variant === 'error' && <AlertCircle className="size-8 stroke-[2.5]" />}
            {variant === 'success' && <CheckCircle2 className="size-8 stroke-[2.5]" />}
            {variant === 'info' && <Info className="size-8 stroke-[2.5]" />}
          </div>

          <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
            {message}
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          {actionPath && (
            <button
              onClick={handleAction}
              className="w-full rounded-2xl bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="size-4" />
              <span>{actionLabel || 'Place Order as Customer'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`w-full rounded-2xl py-3 text-xs font-bold transition cursor-pointer ${
              actionPath
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-[#d9f447] text-[#121815] font-extrabold hover:bg-[#c2dc3a] shadow-lg'
            }`}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}
