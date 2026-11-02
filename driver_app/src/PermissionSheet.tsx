import { useEffect, useState } from 'react'
import { Icon, type IconName } from './Icon'
import {
  openAppSettings,
  PERMISSION_REQUESTS,
  permissionState,
  requestPermission,
  type PermissionId,
  type PermissionState,
} from './permissions'

/**
 * The first-run permission sheet for the driver app.
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

  const grantedIconMap: Record<PermissionId, string> = {
    location: 'pin',
    notifications: 'bell',
    background: 'map-pin',
    updates: 'download',
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="sheet permission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div>
            <p className="eyebrow">WELCOME TO CRAVE DRIVER</p>
            <h2 id="permission-title">A few permissions</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <p className="permission-note">
          These keep the app fast and the right information on screen. You can change them any time
          in your device settings.
        </p>

        <div className="permission-list">
          {PERMISSION_REQUESTS.map((request) => {
            const state = states[request.id] || 'prompt'
            const granted = state === 'granted'
            const iconName = grantedIconMap[request.id] as IconName
            return (
              <div className="permission-row" key={request.id}>
                <span className={`permission-icon ${granted ? 'granted' : ''}`}>
                  <Icon name={iconName} />
                </span>
                <div className="permission-copy">
                  <b>{request.title}</b>
                  <small>{request.reason}</small>
                </div>
                {request.id === 'updates' ? (
                  <button
                    className="permission-action updates"
                    onClick={() => void ask(request.id)}
                  >
                    {granted ? 'Allowed' : 'Open settings'}
                  </button>
                ) : granted ? (
                  <span className="permission-state allowed">Allowed</span>
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
          <button className="secondary-button" onClick={() => void openAppSettings()}>
            Open device settings
          </button>
          <button className="primary-button" onClick={() => void grantAll()}>
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
