'use client'

import { useToast } from '@/lib/toast-context'
import {
  getWebPushRegistration,
  isWebPushSupported,
  subscribeToWebPush,
  syncExistingWebPushSubscription,
  unregisterWebPushSubscription,
} from '@/lib/web-push-client'
import { BellOff, BellRing, Loader2, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type PermissionState = NotificationPermission | 'unsupported'

export default function NotificationSettingsCard() {
  const { toast } = useToast()
  const [permission, setPermission] = useState<PermissionState>('unsupported')
  const [configured, setConfigured] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  const refreshStatus = useCallback(async () => {
    if (submittingRef.current) return
    setLoading(true)
    setError('')

    if (!isWebPushSupported()) {
      setPermission('unsupported')
      setConfigured(false)
      setEnabled(false)
      setLoading(false)
      return
    }

    try {
      setPermission(Notification.permission)
      const [response, registration] = await Promise.all([
        fetch('/api/push/subscriptions', {
          credentials: 'include',
          cache: 'no-store',
        }),
        getWebPushRegistration(),
      ])
      const config = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(config.error || 'Unable to load notification settings.')

      const isConfigured = Boolean(config.configured && config.publicKey)
      const subscription = await registration.pushManager.getSubscription()
      setConfigured(isConfigured)
      setPublicKey(typeof config.publicKey === 'string' ? config.publicKey : '')
      setEnabled(Notification.permission === 'granted' && Boolean(subscription))

      if (Notification.permission === 'granted' && subscription) {
        await syncExistingWebPushSubscription()
      }
    } catch (statusError) {
      setConfigured(false)
      setEnabled(false)
      setError(
        statusError instanceof Error ? statusError.message : 'Unable to load notification settings.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshStatus()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', refreshStatus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', refreshStatus)
    }
  }, [refreshStatus])

  async function enableNotifications() {
    if (!isWebPushSupported()) {
      setError('Push notifications are not supported in this browser or connection.')
      return
    }
    if (!configured || !publicKey) {
      setError('Push notifications are not configured on the server yet.')
      return
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      setError(
        'Notifications are blocked. Open this site in your browser or app settings and allow notifications, then return here.'
      )
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const nextPermission =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      setPermission(nextPermission)
      if (nextPermission !== 'granted') {
        setEnabled(false)
        setError('Permission was not granted. Notifications remain off for this device.')
        return
      }

      await subscribeToWebPush(publicKey)
      setEnabled(true)
      window.dispatchEvent(new Event('crave_push_subscription_changed'))

      const registration = await getWebPushRegistration()
      await registration
        .showNotification('Crave notifications are on', {
          body: 'You will receive order, payment, preparation, pickup and delivery updates.',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'crave-notifications-enabled',
          data: { url: '/user/profile' },
        })
        .catch(() => undefined)
      toast('Notifications enabled on this device.', 'success')
    } catch (subscribeError) {
      setEnabled(false)
      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : 'Unable to enable notifications on this device.'
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function disableNotifications() {
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      await unregisterWebPushSubscription()
      setEnabled(false)
      window.dispatchEvent(new Event('crave_push_subscription_changed'))
      toast('Notifications disabled on this device.', 'success')
    } catch (unsubscribeError) {
      setError(
        unsubscribeError instanceof Error
          ? unsubscribeError.message
          : 'Unable to disable notifications on this device.'
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const unavailable = permission === 'unsupported' || !configured
  const statusText = loading
    ? 'Checking device permission…'
    : enabled
      ? 'Enabled on this device'
      : permission === 'denied'
        ? 'Blocked in browser or app settings'
        : unavailable
          ? 'Unavailable on this device'
          : 'Off on this device'

  return (
    <div className="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs dark:border-white/[0.08] dark:bg-[#161617] sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
              enabled
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-gray-300'
            }`}
          >
            {enabled ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-[#1D1D1F] dark:text-white">
              Order Notifications
              {enabled && <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />}
            </h3>
            <p className="mt-1 max-w-xl text-xs font-medium text-stone-500 dark:text-stone-400">
              Receive popup notifications for payment approval, kitchen preparation, rider pickup
              and delivery—even when Crave is in the background.
            </p>
            <p
              className={`mt-2 text-[11px] font-semibold ${
                enabled
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : permission === 'denied'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle order notifications"
          disabled={loading || submitting || (unavailable && permission !== 'denied')}
          onClick={() => void (enabled ? disableNotifications() : enableNotifications())}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
            enabled ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-700'
          }`}
        >
          <span
            className={`absolute top-1 grid size-6 place-items-center rounded-full bg-white text-[#18201c] shadow-sm transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          >
            {submitting || loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : enabled ? (
              <BellRing className="size-3" />
            ) : (
              <BellOff className="size-3" />
            )}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {!loading && permission === 'granted' && !enabled && (
        <p className="mt-3 text-[10px] text-gray-500 dark:text-gray-400">
          Browser permission is still allowed, but this device is unsubscribed. Turn the toggle on
          to subscribe again.
        </p>
      )}
    </div>
  )
}
