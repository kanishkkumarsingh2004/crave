'use client'

import { useAuth } from '@/lib/auth-context'
import {
  getWebPushRegistration,
  isWebPushSupported,
  subscribeToWebPush,
  syncExistingWebPushSubscription,
} from '@/lib/web-push-client'
import { BellRing, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'crave_push_prompt_dismissed_at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export default function WebPushPrompt() {
  const { user, isLoading } = useAuth()
  const [publicKey, setPublicKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading || !user || !isWebPushSupported()) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function preparePrompt() {
      try {
        await getWebPushRegistration()
        const response = await fetch('/api/push/subscriptions', {
          credentials: 'include',
          cache: 'no-store',
        })
        const config = await response.json()
        if (!response.ok || !config.configured || !config.publicKey || cancelled) return

        setPublicKey(config.publicKey)
        if (Notification.permission === 'granted') {
          await syncExistingWebPushSubscription()
          return
        }
        if (Notification.permission === 'denied') return

        const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
        const isStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true
        if (isIos && !isStandalone) return

        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return

        timer = setTimeout(() => {
          if (!cancelled) setVisible(true)
        }, 3500)
      } catch (prepareError) {
        console.warn('[web-push] Unable to prepare notification prompt:', prepareError)
      }
    }

    void preparePrompt()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isLoading, user?.id])

  useEffect(() => {
    const hideAfterSettingsChange = () => setVisible(false)
    window.addEventListener('crave_push_subscription_changed', hideAfterSettingsChange)
    return () =>
      window.removeEventListener('crave_push_subscription_changed', hideAfterSettingsChange)
  }, [])

  async function enableNotifications() {
    setSubmitting(true)
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notifications were not allowed. You can enable them later in browser settings.')
        return
      }
      await subscribeToWebPush(publicKey)
      localStorage.removeItem(DISMISS_KEY)
      setVisible(false)
      window.dispatchEvent(new Event('crave_push_subscription_changed'))
    } catch (subscribeError) {
      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : 'Unable to enable notifications on this device.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function dismissPrompt() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:w-[420px]"
      role="dialog"
      aria-labelledby="push-notification-title"
      aria-describedby="push-notification-description"
    >
      <div className="rounded-2xl border border-white/10 bg-[#18201c] p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#18201c]">
            <BellRing className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="push-notification-title" className="text-sm font-extrabold">
              Get important order updates
            </h2>
            <p id="push-notification-description" className="mt-1 text-xs text-white/70">
              Allow Crave to notify you about new orders, payment updates, preparation, pickup and
              delivery—even when the app is closed.
            </p>
            {error && <p className="mt-2 text-xs font-semibold text-rose-300">{error}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void enableNotifications()}
                disabled={submitting}
                className="rounded-xl bg-[#d9f447] px-3.5 py-2 text-xs font-extrabold text-[#18201c] transition hover:bg-[#c8e434] disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? 'Enabling…' : 'Enable notifications'}
              </button>
              <button
                type="button"
                onClick={dismissPrompt}
                className="rounded-xl px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="Dismiss notification permission prompt"
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
