'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, variant?: ToastVariant) => void
  dismiss: (id?: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const dismiss = useCallback((id?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Strictly display ONE toast at a time — prevents messy overlapping screen clusters
    setToasts([{ id, message, variant }])

    timerRef.current = setTimeout(() => {
      setToasts([])
      timerRef.current = null
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
