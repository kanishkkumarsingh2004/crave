import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Download, MapPin, Settings, X, type LucideIcon } from 'lucide-react'
import {
  openAppSettings,
  PERMISSION_REQUESTS,
  permissionState,
  requestPermission,
  type PermissionId,
  type PermissionState,
} from './permissions'

const ICON_MAP: Record<string, LucideIcon> = {
  pin: MapPin,
  bell: Bell,
  download: Download,
  'map-pin': MapPin,
}

/**
 * The first-run permission sheet for the admin app.
 */
export function PermissionSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [states, setStates] = useState<Record<string, PermissionState>>({})
  const [busy, setBusy] = useState<PermissionId | null>(null)

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      const entries = await Promise.all(
        PERMISSION_REQUESTS.map(async (request) => {
          const state = await permissionState(request.id).catch(
            () => 'unavailable' as PermissionState
          )
          return [request.id, state] as const
        })
      )
      if (!cancelled) setStates(Object.fromEntries(entries))
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [])

  const ask = async (id: PermissionId) => {
    setBusy(id)
    try {
      const state = await requestPermission(id)
      setStates((current) => ({ ...current, [id]: state }))
    } catch {
      setStates((current) => ({ ...current, [id]: 'denied' }))
    } finally {
      setBusy(null)
    }
  }

  const grantAll = async () => {
    for (const request of PERMISSION_REQUESTS) {
      if (request.id === 'updates') continue
      await ask(request.id)
    }
  }

  const label = (state: PermissionState) =>
    state === 'granted' ? 'Allowed' : state === 'denied' ? 'Denied' : 'Allow'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="bottom-sheet permission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-title">
          <div>
            <p className="eyebrow">WELCOME TO CRAVE ADMIN</p>
            <h2 id="permission-title">A few permissions</h2>
          </div>
          <button className="round pale" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="permission-note">
          These keep the app fast and the right information on screen. You can change them any time
          in your device settings.
        </p>

        <div className="permission-list">
          {PERMISSION_REQUESTS.map((request) => {
            const state = states[request.id] || 'prompt'
            const granted = state === 'granted'
            const IconComponent = ICON_MAP[request.icon] || Bell
            return (
              <div className={`permission-row${granted ? ' granted' : ''}`} key={request.id}>
                <span className="permission-icon">
                  <IconComponent size={20} />
                </span>
                <span className="permission-copy">
                  <b>{request.title}</b>
                  <small>{request.reason}</small>
                </span>
                {request.id === 'updates' ? (
                  <button className="permission-action" onClick={() => void ask(request.id)}>
                    {granted ? 'Allowed' : 'Open settings'}
                  </button>
                ) : granted ? (
                  <span className="permission-state">Allowed</span>
                ) : (
                  <button
                    className="permission-action"
                    disabled={busy === request.id || state === 'unavailable'}
                    onClick={() => void ask(request.id)}
                  >
                    {busy === request.id ? '…' : label(state)}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="permission-actions">
          <button className="secondary" onClick={() => void openAppSettings()}>
            Open device settings
          </button>
          <button className="primary" onClick={() => void grantAll()}>
            Allow all
          </button>
        </div>
        <button className="permission-skip" onClick={onDone}>
          Not now
        </button>
      </section>
    </div>
  )
}
