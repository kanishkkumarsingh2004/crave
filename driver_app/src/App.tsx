import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import appLogo from '../assets/logo.svg'
import {
  ApiError,
  apiRequest,
  clearAuthToken,
  COOKIE_SESSION_TOKEN,
  getAuthToken,
  restoreAuthToken,
  saveAuthToken,
} from './api'
import { Icon, type IconName } from './Icon'
import { PermissionSheet } from './PermissionSheet'
import {
  getNotificationPreference,
  getStoredDutyStatus,
  initializeNativeAppearance,
  notifyDriverAppUpdate,
  openNavigation,
  registerDriverPushNotifications,
  requestCurrentPosition,
  requestNotificationPermission,
  setNotificationPreference,
  setStoredDutyStatus,
  showDriverNotification,
  startBackgroundDriverLocation,
  stopBackgroundDriverLocation,
  unregisterDriverPushNotifications,
  updateBackgroundDriverLocation,
  watchDriverPosition,
} from './native'
import { connectDriverEvents } from './realtime'
import { checkForDriverUpdate, installDriverUpdate, type DriverUpdate } from './update'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'
import { useLanguage, type SupportedLocale } from '../../dictionary/react'
import { hasSeenPermissionSheet, markPermissionSheetSeen } from './permissions'
import type {
  AppTab,
  CompletedTrip,
  DriverOffer,
  DriverOrder,
  DriverOrdersResponse,
  DriverProfile,
  DriverUser,
  PayoutLog,
  UpiAccount,
} from './types'

const ACTIVE_STATUSES = new Set([
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
])
const AVAILABLE_OFFER_STATUSES = new Set([
  'sent_to_vendor',
  'preparing',
  'packing',
  'ready_for_pickup',
])

function toDriverOffer(order: DriverOrder): DriverOffer {
  let items: any[] = []
  try {
    items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
        ? JSON.parse(order.items)
        : []
  } catch {}
  return {
    id: order.id,
    status: order.status,
    restaurantId: order.restaurant_id,
    restaurantName: order.restaurant_name || 'Crave restaurant',
    customerArea: 'Delivery address shown after acceptance',
    itemsCount:
      items.reduce((total, item) => total + Number(item?.qty || item?.quantity || 1), 0) || 1,
    distanceKm: Number((order as any).distance_km || 0),
    driverPayout: Number(
      order.financial_snapshot?.riderPayablePaise != null
        ? order.financial_snapshot.riderPayablePaise / 100
        : order.driver_payout || order.delivery_fee || 30
    ),
    tip: Number(order.tip || 0),
    createdAt: order.created_at,
  }
}

function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function shortId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`
}

function dateTime(value?: string): string {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ready_for_pickup: 'Ready for pickup',
    rider_assigned: 'Go to restaurant',
    picked_up: 'Order picked up',
    out_for_delivery: 'At customer location',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

function driverPay(order: DriverOrder): number {
  if (order.financial_snapshot?.riderPayablePaise != null) {
    return Number(order.financial_snapshot.riderPayablePaise) / 100
  }
  return Number(order.driver_payout || order.delivery_fee || 0) + Number(order.tip || 0)
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />
      <section className="login-card">
        <div className="brand-lockup brand-lockup-large">
          <img className="brand-mark" src={appLogo} alt="Crave" />
          <div>
            <strong>crave.</strong>
            <small>delivery partner</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Your delivery cockpit</span>
          <h1>Every trip. One clear route.</h1>
          <p>Live offers, guided delivery steps, earnings and payouts—built for Crave riders.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            Driver email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="driver@crave.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button login-button" type="submit" disabled={submitting}>
            {submitting ? <span className="button-spinner" /> : 'Open driver app'}
          </button>
        </form>
        <p className="login-security">Secure access for approved Crave delivery partners.</p>
      </section>
    </main>
  )
}

function OfferCard({
  offer,
  busy,
  onAccept,
}: {
  offer: DriverOffer
  busy: boolean
  onAccept: (offer: DriverOffer) => void
}) {
  const total = offer.driverPayout
  return (
    <article className="offer-card">
      <div className="offer-card-head">
        <div>
          <span className="live-kicker">
            <i /> Live offer
          </span>
          <h3>{offer.restaurantName}</h3>
          <p>{dateTime(offer.createdAt)}</p>
        </div>
        <div className="offer-pay">
          <span>You earn</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div className="route-line">
        <span className="route-dot pickup" />
        <div>
          <b>Pickup</b>
          <span>{offer.restaurantName}</span>
        </div>
        <span className="route-connector" />
        <span className="route-dot drop" />
        <div>
          <b>Drop</b>
          <span>{offer.customerArea}</span>
        </div>
      </div>
      <div className="offer-facts">
        <span>
          <Icon name="trips" /> {offer.itemsCount} item{offer.itemsCount === 1 ? '' : 's'}
        </span>
        <span>
          <Icon name="navigation" />{' '}
          {offer.distanceKm > 0 ? `${offer.distanceKm.toFixed(1)} km` : 'Distance on accept'}
        </span>
        {offer.tip > 0 && <span className="tip-chip">+{money(offer.tip)} tip</span>}
      </div>
      <button
        className="primary-button offer-accept"
        disabled={busy}
        onClick={() => onAccept(offer)}
      >
        {busy ? <span className="button-spinner dark" /> : 'Accept delivery'}
        {!busy && <Icon name="chevron" />}
      </button>
    </article>
  )
}

function ActiveTripCard({
  order,
  busy,
  onAdvance,
  onComplete,
}: {
  order: DriverOrder
  busy: boolean
  onAdvance: () => void
  onComplete: () => void
}) {
  const isFinal = order.status === 'out_for_delivery'
  const nextLabel =
    order.status === 'picked_up'
      ? 'Start delivery'
      : order.status === 'out_for_delivery'
        ? 'Complete with OTP'
        : 'Confirm pickup'
  const progress = order.status === 'out_for_delivery' ? 3 : order.status === 'picked_up' ? 2 : 1

  return (
    <article className="active-trip-card">
      <header>
        <div>
          <span className="live-kicker">
            <i /> Active delivery
          </span>
          <h2>{shortId(order.id)}</h2>
        </div>
        <strong>{money(driverPay(order))}</strong>
      </header>
      <div className="trip-progress">
        {['Pickup', 'On the way', 'Delivered'].map((label, index) => (
          <div className={index + 1 <= progress ? 'done' : ''} key={label}>
            <span>{index + 1 < progress ? <Icon name="check" /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="trip-stop">
        <span className="trip-stop-icon pickup">
          <Icon name="bike" />
        </span>
        <div>
          <small>Restaurant</small>
          <strong>{order.restaurant_name || 'Crave restaurant'}</strong>
          <p>
            {order.status === 'rider_assigned' ? 'Head to the pickup counter' : 'Pickup confirmed'}
          </p>
        </div>
        <button
          className="icon-action"
          aria-label="Navigate to restaurant"
          onClick={() => openNavigation(undefined, undefined, order.restaurant_name)}
        >
          <Icon name="navigation" />
        </button>
      </div>
      <div className="trip-stop">
        <span className="trip-stop-icon drop">
          <Icon name="pin" />
        </span>
        <div>
          <small>Customer</small>
          <strong>{order.customer_name || 'Crave customer'}</strong>
          <p>{order.customer_address || 'Address available for this delivery'}</p>
        </div>
        <div className="trip-actions">
          {order.customer_phone && (
            <a
              className="icon-action"
              aria-label="Call customer"
              href={`tel:${order.customer_phone}`}
            >
              <Icon name="phone" />
            </a>
          )}
          <button
            className="icon-action"
            aria-label="Navigate to customer"
            onClick={() =>
              openNavigation(
                Number(order.delivery_latitude) || undefined,
                Number(order.delivery_longitude) || undefined,
                order.customer_address
              )
            }
          >
            <Icon name="navigation" />
          </button>
        </div>
      </div>
      <button
        className="primary-button trip-primary-action"
        disabled={busy}
        onClick={isFinal ? onComplete : onAdvance}
      >
        {busy ? <span className="button-spinner dark" /> : nextLabel}
        {!busy && <Icon name="chevron" />}
      </button>
    </article>
  )
}

function TripsPage({ orders, trips }: { orders: DriverOrder[]; trips: CompletedTrip[] }) {
  const history = orders.filter((order) => !ACTIVE_STATUSES.has(order.status))
  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Delivery record</span>
          <h1>Your trips</h1>
        </div>
        <span className="count-badge">{trips.length || history.length} completed</span>
      </div>
      <div className="trip-history-list">
        {trips.length > 0 ? (
          trips.map((trip) => (
            <article className="history-card" key={trip.id}>
              <span className="history-icon">
                <Icon name="check" />
              </span>
              <div className="history-main">
                <div>
                  <strong>{trip.restaurant}</strong>
                  <span>
                    {trip.order} · {trip.time}
                  </span>
                </div>
                <p>
                  <Icon name="pin" /> {trip.customer} · {trip.distance}
                </p>
              </div>
              <strong className="history-pay">{money(trip.total)}</strong>
            </article>
          ))
        ) : history.length > 0 ? (
          history.map((order) => (
            <article className="history-card" key={order.id}>
              <span className="history-icon">
                <Icon name="check" />
              </span>
              <div className="history-main">
                <div>
                  <strong>{order.restaurant_name}</strong>
                  <span>
                    {shortId(order.id)} · {dateTime(order.created_at)}
                  </span>
                </div>
                <p>{statusLabel(order.status)}</p>
              </div>
              <strong className="history-pay">{money(driverPay(order))}</strong>
            </article>
          ))
        ) : (
          <EmptyState
            icon="trips"
            title="No completed trips yet"
            text="Completed deliveries will appear here with their final earnings."
          />
        )}
      </div>
    </section>
  )
}

function EarningsPage({
  trips,
  payouts,
  upi,
  busy,
  onCashout,
  onAddUpiAccount,
}: {
  trips: CompletedTrip[]
  payouts: PayoutLog[]
  upi: UpiAccount[]
  busy: boolean
  onCashout: (amount: number) => Promise<void>
  onAddUpiAccount: () => void
}) {
  const earned = trips.reduce((total, trip) => total + Number(trip.total || 0), 0)
  const withdrawn = payouts
    .filter((p) => {
      const s = String(p.status || '').toLowerCase()
      return (
        s.includes('paid') ||
        s.includes('transfer') ||
        s.includes('complete') ||
        s.includes('success')
      )
    })
    .reduce((total, payout) => total + Number(payout.amount || 0), 0)
  // A pending request is reserved, so it can never be requested a second time.
  const reserved = payouts
    .filter((p) =>
      String(p.status || '')
        .toLowerCase()
        .includes('pending')
    )
    .reduce((total, payout) => total + Number(payout.amount || 0), 0)
  const balance = Math.max(0, earned - withdrawn - reserved)
  const primary = upi.find((account) => account.isPrimary)
  const [amount, setAmount] = useState('')
  const [showCashout, setShowCashout] = useState(false)
  const [hint, setHint] = useState('')

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Money centre</span>
          <h1>Earnings</h1>
        </div>
      </div>
      <article className="wallet-hero">
        <span>Available balance</span>
        <strong>{money(balance)}</strong>
        <p>{primary ? `Payout to ${primary.vpa}` : 'Add a UPI account from the Account page'}</p>
        <button
          className="light-button"
          onClick={() => {
            if (!primary) {
              setHint('Add a UPI payout account to receive your money.')
              onAddUpiAccount()
              return
            }
            if (balance <= 0) {
              setHint('No available balance yet. Earnings appear after a delivery is completed.')
              return
            }
            setHint('')
            setAmount(String(Math.floor(balance)))
            setShowCashout(true)
          }}
        >
          Request payout
        </button>
        {hint && <p className="wallet-hint">{hint}</p>}
      </article>
      <div className="money-stats">
        <article>
          <span>Lifetime earned</span>
          <strong>{money(earned)}</strong>
        </article>
        <article>
          <span>Paid out</span>
          <strong>{money(withdrawn)}</strong>
        </article>
        <article>
          <span>Trips</span>
          <strong>{trips.length}</strong>
        </article>
      </div>
      <div className="section-title">
        <h2>Payout activity</h2>
      </div>
      <div className="payout-list">
        {payouts.length > 0 ? (
          payouts.map((payout) => (
            <article key={payout.id}>
              <span className="payout-icon">
                <Icon name="wallet" />
              </span>
              <div>
                <strong>{payout.status}</strong>
                <small>{payout.date}</small>
              </div>
              <b>-{money(payout.amount)}</b>
            </article>
          ))
        ) : (
          <EmptyState
            icon="wallet"
            title="No payouts yet"
            text="Your payout requests and transfers will be shown here."
          />
        )}
      </div>
      {showCashout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="sheet small-sheet">
            <header>
              <div>
                <span className="eyebrow">Instant payout</span>
                <h2>Move your earnings</h2>
              </div>
              <button className="icon-button" onClick={() => setShowCashout(false)}>
                <Icon name="close" />
              </button>
            </header>
            <label className="field-label">
              Amount
              <input
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <div className="destination-card">
              <Icon name="card" />
              <div>
                <span>Destination</span>
                <strong>{primary?.vpa}</strong>
              </div>
            </div>
            <button
              className="primary-button"
              disabled={busy || Number(amount) <= 0 || Number(amount) > balance}
              onClick={async () => {
                await onCashout(Number(amount))
                setShowCashout(false)
              }}
            >
              {busy ? <span className="button-spinner dark" /> : `Request ${money(amount)}`}
            </button>
          </section>
        </div>
      )}
    </section>
  )
}

function AccountPage({
  profile,
  upi,
  notificationsEnabled,
  notificationBusy,
  busy,
  onSaveProfile,
  onChangePassword,
  onAddUpi,
  onPrimaryUpi,
  onDeleteUpi,
  onToggleNotifications,
  onTheme,
  theme,
  availableUpdate,
  checkingUpdate,
  installingUpdate,
  updateError,
  onCheckUpdate,
  onInstallUpdate,
  onLogout,
}: {
  profile: DriverProfile
  upi: UpiAccount[]
  notificationsEnabled: boolean
  notificationBusy: boolean
  busy: boolean
  onSaveProfile: (profile: DriverProfile) => Promise<void>
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>
  onAddUpi: (vpa: string, bankName: string) => Promise<void>
  onPrimaryUpi: (id: string) => Promise<void>
  onDeleteUpi: (id: string) => Promise<void>
  onToggleNotifications: (enabled: boolean) => Promise<void>
  onTheme: (mode: ThemeMode) => void
  theme: ThemeMode
  availableUpdate: DriverUpdate | null
  checkingUpdate: boolean
  installingUpdate: boolean
  updateError: string
  onCheckUpdate: () => Promise<void>
  onInstallUpdate: () => Promise<void>
  onLogout: () => Promise<void>
}) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(profile)
  const [vpa, setVpa] = useState('')
  const [provider, setProvider] = useState('Google Pay / PhonePe UPI')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [passwordSheet, setPasswordSheet] = useState(false)
  const [updateSheet, setUpdateSheet] = useState(false)
  const [languageSheet, setLanguageSheet] = useState(false)
  const { locale: language, setLocale, languages } = useLanguage()
  const setLanguage = (code: SupportedLocale) => void setLocale(code)

  useEffect(() => setDraft(profile), [profile])

  return (
    <section className="page-section account-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Partner account</span>
          <h1>Profile & settings</h1>
        </div>
      </div>
      <article className="profile-summary">
        <span className="profile-avatar">{profile.name?.charAt(0).toUpperCase() || 'D'}</span>
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <span>
            {profile.kycStatus || 'Verified delivery partner'}
          </span>
        </div>
      </article>
      <article className="settings-card">
        <div className="settings-card-title">
          <span className="settings-icon">
            <Icon name="bell" />
          </span>
          <div>
            <h3>Delivery notifications</h3>
            <p>Get instant alerts for nearby offers and trip updates.</p>
          </div>
          <button
            type="button"
            className={`switch ${notificationsEnabled ? 'on' : ''}`}
            aria-label="Toggle delivery notifications"
            role="switch"
            aria-checked={notificationsEnabled}
            aria-busy={notificationBusy}
            disabled={notificationBusy}
            onClick={() => void onToggleNotifications(!notificationsEnabled)}
          >
            <span />
          </button>
        </div>
      </article>
      <h2 className="section-title">App</h2>
      <div className="settings-list">
        <button onClick={() => setUpdateSheet(true)}>
          <span className="settings-list-icon">
            <Icon name="refresh" />
          </span>
          <span>
            <b>{t.settings.checkForUpdates}</b>
            <small>
              {checkingUpdate
                ? 'Checking for the latest driver app…'
                : availableUpdate
                  ? `Version ${availableUpdate.versionName} is available`
                  : updateError || 'You are using the latest available version.'}
            </small>
          </span>
          <Icon name="chevron" />
        </button>
        <button onClick={() => setPasswordSheet(true)}>
          <span className="settings-list-icon">
            <Icon name="shield" />
          </span>
          <span>
            <b>{t.settings.changePassword}</b>
            <small>{t.settings.changePasswordHint}</small>
          </span>
          <Icon name="chevron" />
        </button>
        <button onClick={() => setLanguageSheet(true)}>
          <span className="settings-list-icon">
            <Icon name="language" />
          </span>
          <span>
            <b>{t.settings.language}</b>
            <small>{language}</small>
          </span>
          <Icon name="chevron" />
        </button>
      </div>
      <article className="settings-card">
        <div className="settings-card-title">
          <span className="settings-icon">
            <Icon name="theme" />
          </span>
          <div>
            <h3>Appearance</h3>
            <p>Choose light, dark, or follow your device setting.</p>
          </div>
        </div>
        <div className="theme-control" role="group" aria-label="Driver app theme">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={theme === mode ? 'active' : ''}
              aria-pressed={theme === mode}
              onClick={() => onTheme(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </article>
      <article className="settings-card">
        <div className="settings-card-title">
          <span className="settings-icon">
            <Icon name="user" />
          </span>
          <div>
            <h3>Personal & vehicle details</h3>
            <p>These details are shared with customers during an active trip.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field-label">
            Full name
            <input
              value={draft.name || ''}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="field-label">
            Phone
            <input
              value={draft.phone || ''}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
            />
          </label>
          <label className="field-label full">
            Operating address
            <input
              value={draft.address || ''}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
            />
          </label>
          <label className="field-label">
            Vehicle type
            <select
              value={draft.vehicleType || ''}
              onChange={(event) => setDraft({ ...draft, vehicleType: event.target.value })}
            >
              <option>Commercial EV Delivery Scooter</option>
              <option>Petrol Two-Wheeler Motorcycle</option>
              <option>Cargo E-Loader Trike</option>
              <option>Bicycle Partner</option>
            </select>
          </label>
          <label className="field-label">
            License plate
            <input
              value={draft.licensePlate || ''}
              onChange={(event) =>
                setDraft({ ...draft, licensePlate: event.target.value.toUpperCase() })
              }
            />
          </label>
        </div>
        <button className="secondary-button" disabled={busy} onClick={() => onSaveProfile(draft)}>
          Save profile
        </button>
      </article>
      <article className="settings-card">
        <div className="settings-card-title">
          <span className="settings-icon">
            <Icon name="card" />
          </span>
          <div>
            <h3>UPI payout accounts</h3>
            <p>Choose where your approved payouts should be sent.</p>
          </div>
        </div>
        <div className="upi-list">
          {upi.map((account) => (
            <div className={account.isPrimary ? 'primary' : ''} key={account.id}>
              <button
                className="radio-button"
                aria-label="Make primary"
                onClick={() => onPrimaryUpi(account.id)}
              >
                <span />
              </button>
              <div>
                <strong>{account.vpa}</strong>
                <small>
                  {account.bankName} · {account.isVerified ? 'Verified' : 'Pending'}
                </small>
              </div>
              {!account.isPrimary && (
                <button className="text-danger" onClick={() => onDeleteUpi(account.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <form
          className="upi-form"
          onSubmit={async (event) => {
            event.preventDefault()
            await onAddUpi(vpa, provider)
            setVpa('')
          }}
        >
          <input
            required
            pattern=".+@.+"
            placeholder="name@upi"
            value={vpa}
            onChange={(event) => setVpa(event.target.value)}
          />
          <select value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option>Google Pay / PhonePe UPI</option>
            <option>Paytm Payments Bank</option>
            <option>BHIM NPCI UPI</option>
            <option>Bank UPI</option>
          </select>
          <button className="secondary-button" type="submit">
            Add UPI
          </button>
        </form>
      </article>
      <button className="logout-button" onClick={() => setConfirmLogout(true)}>
        <Icon name="logout" /> Sign out of driver app
      </button>
      {updateSheet && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setUpdateSheet(false)}
        >
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <div>
                <span className="eyebrow">Driver app</span>
                <h2>{t.settings.checkForUpdates}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setUpdateSheet(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </header>
            <p>
              {checkingUpdate
                ? 'Checking for the latest driver app…'
                : availableUpdate
                  ? `Version ${availableUpdate.versionName} is available. ${availableUpdate.releaseNotes}`
                  : updateError || 'You are using the latest available version.'}
            </p>
            <div className="software-actions">
              <button
                className="secondary-button"
                disabled={checkingUpdate || installingUpdate}
                onClick={() => void onCheckUpdate()}
              >
                {checkingUpdate ? 'Checking…' : 'Check again'}
              </button>
              <button
                className="primary-button"
                disabled={!availableUpdate || checkingUpdate || installingUpdate}
                onClick={() => void onInstallUpdate()}
              >
                {installingUpdate
                  ? 'Opening installer…'
                  : availableUpdate
                    ? `Update to ${availableUpdate.versionName}`
                    : 'App is up to date'}
              </button>
            </div>
            {updateError && availableUpdate && <p className="software-error">{updateError}</p>}
          </section>
        </div>
      )}

      {passwordSheet && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPasswordSheet(false)}
        >
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <div>
                <span className="eyebrow">Account security</span>
                <h2>{t.settings.changePassword}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setPasswordSheet(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </header>
            <p>Keep your driver account secure with a new sign-in password.</p>
            <ChangePasswordForm onChangePassword={onChangePassword} />
          </section>
        </div>
      )}

      {languageSheet && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setLanguageSheet(false)}
        >
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <div>
                <span className="eyebrow">App language</span>
                <h2>{t.settings.chooseLanguage}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setLanguageSheet(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </header>
            <div className="language-list">
              {languages.map((option) => (
                <button
                  key={option.code}
                  className={language === option.code ? 'selected' : ''}
                  onClick={() => {
                    setLanguage(option.code)
                    setLanguageSheet(false)
                  }}
                >
                  <span>{option.nativeName}</span>
                  {language === option.code && <Icon name="check" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {confirmLogout && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-logout-title"
          onClick={() => setConfirmLogout(false)}
        >
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <div>
                <span className="eyebrow">Confirm sign out</span>
                <h2 id="driver-logout-title">Really sign out?</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setConfirmLogout(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </header>
            <p>You will be signed out of the driver app. You can sign back in anytime.</p>
            <div className="form-grid" style={{ marginTop: 12, gap: 10 }}>
              <button className="secondary-button" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={onLogout}>
                <Icon name="logout" /> Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

/** Languages the app can be switched to. */
function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function ChangePasswordForm({
  onChangePassword,
}: {
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  function validatePassword(value: string, label: string): string | null {
    if (value.length < 8 || value.length > 256) {
      return `${label} must be between 8 and 256 characters.`
    }
    return null
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    const currentError = validatePassword(currentPassword, 'Current password')
    const newError = validatePassword(newPassword, 'New password')
    const confirmError = validatePassword(confirmPassword, 'Confirm password')
    const validationError = currentError || newError || confirmError

    if (validationError) {
      setFeedback({ type: 'error', message: validationError })
      return
    }
    if (currentPassword === newPassword) {
      setFeedback({
        type: 'error',
        message: 'New password must be different from your current password.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      await onChangePassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setFeedback({ type: 'success', message: 'Password changed successfully.' })
    } catch (changePasswordError) {
      setFeedback({
        type: 'error',
        message:
          changePasswordError instanceof Error
            ? changePasswordError.message
            : 'Unable to change your password.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="settings-card">
      <div className="settings-card-title">
        <span className="settings-icon">
          <Icon name="shield" />
        </span>
        <div>
          <h3>Change password</h3>
          <p>Keep your driver account secure with a new sign-in password.</p>
        </div>
      </div>
      <form className="change-password-form" onSubmit={submit} noValidate>
        <label className="field-label">
          Current password
          <span className="password-field">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              maxLength={256}
              aria-required="true"
            />
            <button
              type="button"
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              aria-pressed={showCurrentPassword}
              onClick={() => setShowCurrentPassword((value) => !value)}
            >
              {showCurrentPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        <label className="field-label">
          New password
          <span className="password-field">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              maxLength={256}
              aria-required="true"
            />
            <button
              type="button"
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              aria-pressed={showNewPassword}
              onClick={() => setShowNewPassword((value) => !value)}
            >
              {showNewPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        <label className="field-label">
          Confirm new password
          <span className="password-field">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              maxLength={256}
              aria-required="true"
            />
            <button
              type="button"
              aria-label={
                showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'
              }
              aria-pressed={showConfirmPassword}
              onClick={() => setShowConfirmPassword((value) => !value)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        {feedback && (
          <p
            className={`change-password-feedback ${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? <span className="button-spinner dark" /> : 'Change password'}
        </button>
      </form>
    </article>
  )
}

function OtpSheet({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean
  onClose: () => void
  onSubmit: (otp: string) => Promise<void>
}) {
  const [otp, setOtp] = useState('')
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="sheet otp-sheet">
        <header>
          <div>
            <span className="eyebrow">Secure handoff</span>
            <h2>Enter customer OTP</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <p>
          Ask the customer for the 6-digit delivery code before handing over the order. The code
          appears on their order screen from the moment you pick up the food.
        </p>
        <input
          className="otp-input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
        />
        <button
          className="primary-button"
          disabled={busy || otp.length !== 6}
          onClick={() => onSubmit(otp)}
        >
          {busy ? <span className="button-spinner dark" /> : 'Verify and complete delivery'}
        </button>
      </section>
    </div>
  )
}

const NAV_ITEMS: Array<{ tab: AppTab; label: string; icon: IconName }> = [
  { tab: 'home', label: 'Home', icon: 'home' },
  { tab: 'trips', label: 'Trips', icon: 'trips' },
  { tab: 'earnings', label: 'Earnings', icon: 'wallet' },
  { tab: 'account', label: 'Account', icon: 'user' },
]

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<DriverUser | null>(null)
  const [profile, setProfile] = useState<DriverProfile | null>(null)
  const [tab, setTab] = useState<AppTab>('home')
  const [theme, setTheme] = useState<ThemeMode>('system')
  const [online, setOnline] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'off' | 'acquiring' | 'live' | 'error'>('off')
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [networkConnected, setNetworkConnected] = useState(true)
  const [offers, setOffers] = useState<DriverOffer[]>([])
  const [orders, setOrders] = useState<DriverOrder[]>([])
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([])
  const [payouts, setPayouts] = useState<PayoutLog[]>([])
  const [upi, setUpi] = useState<UpiAccount[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [availableUpdate, setAvailableUpdate] = useState<DriverUpdate | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [otpOpen, setOtpOpen] = useState(false)
  const [permissionSheet, setPermissionSheet] = useState(false)
  const activeOrder = useMemo(
    () => orders.find((order) => ACTIVE_STATUSES.has(order.status)) || null,
    [orders]
  )
  const activeOrderRef = useRef<DriverOrder | null>(null)
  const backgroundTrackingStartedRef = useRef(false)
  const updateCheckRunningRef = useRef(false)

  useEffect(() => {
    activeOrderRef.current = activeOrder
  }, [activeOrder])

  useEffect(() => {
    void refreshUpdateStatus()
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(theme)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])

  useEffect(() => {
    if (tab === 'account') void refreshUpdateStatus()
  }, [tab])

  useEffect(() => {
    if (!user || !notificationsEnabled) return
    let disposed = false
    let removeListeners: (() => void) | undefined
    void registerDriverPushNotifications(() => {
      setTab('home')
      void Promise.all([loadData(), online ? loadOffers() : Promise.resolve()])
    })
      .then((cleanup) => {
        if (disposed) cleanup()
        else removeListeners = cleanup
      })
      .catch((registrationError) => {
        console.warn('Driver push listeners could not be started', registrationError)
      })
    return () => {
      disposed = true
      removeListeners?.()
    }
  }, [user?.id, notificationsEnabled, online])

  useEffect(() => {
    if (!user || !online) {
      backgroundTrackingStartedRef.current = false
      void stopBackgroundDriverLocation()
      return
    }

    let cancelled = false
    void (async () => {
      try {
        if (!backgroundTrackingStartedRef.current) {
          await requestCurrentPosition()
          if (cancelled) return
          await startBackgroundDriverLocation({
            driverId: user.id,
            token: getAuthToken(),
            activeOrderId: activeOrder?.id,
            vehicleType: profile?.vehicleType,
          })
          backgroundTrackingStartedRef.current = true
        } else {
          await updateBackgroundDriverLocation({
            driverId: user.id,
            token: getAuthToken(),
            activeOrderId: activeOrder?.id,
            vehicleType: profile?.vehicleType,
          })
        }
      } catch (trackingError) {
        if (!cancelled) {
          setGpsStatus('error')
          setError(
            trackingError instanceof Error
              ? trackingError.message
              : 'Unable to keep live location active.'
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, online, activeOrder?.id, profile?.vehicleType])

  async function loadData(token?: string) {
    const authToken = token || getAuthToken()
    const [profileResult, ordersResult, payoutsResult, upiResult] = await Promise.all([
      apiRequest<{ profile: DriverProfile }>('/api/driver/profile', { token: authToken }),
      apiRequest<DriverOrdersResponse>('/api/driver/orders', { token: authToken }),
      apiRequest<{ payoutLogs: PayoutLog[] }>('/api/driver/payouts', { token: authToken }),
      apiRequest<{ savedUpiList: UpiAccount[] }>('/api/driver/upi', { token: authToken }),
    ])
    setProfile(profileResult.profile)
    setOrders(ordersResult.allAssignedOrders || [])
    setCompletedTrips(ordersResult.completedTrips || [])
    setPayouts(payoutsResult.payoutLogs || [])
    setUpi(upiResult.savedUpiList || [])
  }

  async function loadOffers() {
    try {
      const response = await apiRequest<{ offers: DriverOffer[] }>('/api/driver/offers')
      setOffers(response.offers || [])
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        const fallback = await apiRequest<{ orders: DriverOrder[] }>('/api/orders?available=true')
        setOffers(
          (fallback.orders || [])
            .filter(
              (order: any) =>
                AVAILABLE_OFFER_STATUSES.has(order.status) &&
                order.payment_status === 'verified' &&
                !order.rider_id
            )
            .map(toDriverOffer)
        )
        return
      }
      if (loadError instanceof ApiError && loadError.status === 401) throw loadError
    }
  }

  async function startSession(sessionUser: DriverUser, token: string) {
    if (!['rider', 'driver'].includes(sessionUser.role)) {
      throw new Error('Please sign in with an approved delivery partner account.')
    }
    await saveAuthToken(token)
    setUser(sessionUser)
    await loadData(token)
    const storedOnline = await getStoredDutyStatus()
    setOnline(storedOnline)
    setNotificationsEnabled(await getNotificationPreference())
    if (storedOnline) await loadOffers()
  }

  useEffect(() => {
    let cancelled = false
    try {
      void initializeNativeAppearance()
    } catch {
      // Native appearance init must never block the app.
    }
    // On launch, compare the published build's checksum with the one on this
    // device. A different checksum means a new build — tell the driver.
    void (async () => {
      try {
        const available = await checkForDriverUpdate()
        if (available) {
          await notifyDriverAppUpdate(
            `Crave Driver ${available.versionName} available`,
            available.releaseNotes
          )
        }
      } catch {
        // A failed check must never block the app.
      }
    })()
    // The permission sheet is shown once, on the first launch.
    void hasSeenPermissionSheet().then((seen) => {
      if (!seen) setPermissionSheet(true)
    })
    void (async () => {
      try {
        const mode = await loadTheme()
        if (cancelled) return
        setTheme(mode)
      } catch {
        setTheme('system')
      }
    })()
    // Bootstrap auth session with a hard timeout so the splash screen never
    // stays visible indefinitely, even if the API is unreachable.
    const bootTimeout = setTimeout(() => {
      if (!cancelled) setBooting(false)
    }, 5000)
    void (async () => {
      try {
        const token = await restoreAuthToken()
        if (!token) return
        const response = await apiRequest<{ profile: DriverProfile }>('/api/driver/profile', {
          token,
        })
        if (cancelled) return
        await startSession(response.profile, token)
      } catch (bootstrapError) {
        if (bootstrapError instanceof ApiError && bootstrapError.status === 401) {
          await clearAuthToken()
        }
      } finally {
        if (!cancelled) {
          clearTimeout(bootTimeout)
          setBooting(false)
        }
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(bootTimeout)
    }
  }, [])

  useEffect(() => {
    const handles: Array<{ remove: () => Promise<void> }> = []
    void Network.getStatus().then((status) => setNetworkConnected(status.connected))
    void Network.addListener('networkStatusChange', (status) =>
      setNetworkConnected(status.connected)
    ).then((handle) => handles.push(handle))
    void CapacitorApp.addListener('resume', () => {
      if (user) void Promise.all([loadData(), online ? loadOffers() : Promise.resolve()])
    }).then((handle) => handles.push(handle))
    void CapacitorApp.addListener('backButton', () => {
      if (tab !== 'home') setTab('home')
      else void CapacitorApp.minimizeApp()
    }).then((handle) => handles.push(handle))
    return () => {
      handles.forEach((handle) => void handle.remove())
    }
  }, [user?.id, online, tab])

  useEffect(() => {
    if (!user || !getAuthToken() || getAuthToken() === COOKIE_SESSION_TOKEN) {
      setWsConnected(false)
      return
    }
    return connectDriverEvents({
      token: getAuthToken(),
      activeOrderId: activeOrder?.id,
      onStatus: setWsConnected,
      onEvent: (channel, data) => {
        if (channel === 'driver_offers') {
          if (data?.type === 'offer_claimed' && data.orderId) {
            setOffers((current) => current.filter((offer) => offer.id !== data.orderId))
          } else if (
            data?.type === 'offer_available' &&
            data.order &&
            online &&
            !activeOrderRef.current
          ) {
            const offer = data.order as DriverOffer
            setOffers((current) => [offer, ...current.filter((item) => item.id !== offer.id)])
            setNotice(`New delivery from ${offer.restaurantName}`)
            void showDriverNotification({
              id: offer.id,
              title: `New trip · ${money(offer.driverPayout)}`,
              body: `${offer.restaurantName} · ${offer.itemsCount} item${offer.itemsCount === 1 ? '' : 's'}`,
            })
          }
        }
        if (channel === 'order_update' && data?.order) {
          const updated = data.order as DriverOrder
          setOrders((current) => [updated, ...current.filter((order) => order.id !== updated.id)])
        }
      },
    })
  }, [user?.id, activeOrder?.id, online])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      void loadData().catch(() => undefined)
      if (online && !activeOrderRef.current) void loadOffers().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [user?.id, online])

  useEffect(() => {
    if (!user || !online) {
      setGpsStatus('off')
      return
    }
    let stop: (() => void) | undefined
    let cancelled = false
    setGpsStatus('acquiring')
    void watchDriverPosition(
      (position) => {
        if (cancelled) return
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setCoords(next)
        setGpsStatus('live')
        if (!Capacitor.isNativePlatform()) {
          const currentOrder = activeOrderRef.current
          void apiRequest('/api/driver/location', {
            method: 'POST',
            body: {
              driverId: user.id,
              orderId: currentOrder?.id,
              lat: next.lat,
              lng: next.lng,
              status: currentOrder ? 'ON_TRIP' : 'ONLINE',
              available: !currentOrder,
              vehicleType: profile?.vehicleType || 'EV_SCOOTER',
              timestamp: position.timestamp,
            },
          }).catch(() => undefined)
        }
      },
      (message) => {
        if (!cancelled) {
          setGpsStatus('error')
          setError(message)
        }
      }
    ).then((cleanup) => {
      if (cancelled) cleanup()
      else stop = cleanup
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [user?.id, online, activeOrder?.id])

  async function login(email: string, password: string) {
    const response = await apiRequest<{ token?: string; user: DriverUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      token: '',
    })
    let sessionUser = response.user
    let sessionToken = response.token
    if (!sessionToken) {
      const cookieSession = await apiRequest<{ authenticated: boolean; user?: DriverUser }>(
        '/api/auth/me',
        { token: '' }
      )
      if (!cookieSession.authenticated || !cookieSession.user) {
        throw new Error('Sign-in succeeded, but the secure app session could not be restored.')
      }
      sessionUser = cookieSession.user
      sessionToken = COOKIE_SESSION_TOKEN
    }
    try {
      await startSession(sessionUser, sessionToken)
    } catch (sessionError) {
      await clearAuthToken()
      setUser(null)
      throw sessionError
    }
  }

  async function toggleDuty(nextOnline: boolean) {
    if (!user || busyKey) return
    if (!nextOnline && activeOrder) {
      setError('Complete the active delivery before going offline.')
      return
    }
    setBusyKey('duty')
    setError('')
    try {
      if (nextOnline) {
        setGpsStatus('acquiring')
        const position = await requestCurrentPosition()
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setCoords(next)
        await apiRequest('/api/driver/location', {
          method: 'POST',
          body: {
            driverId: user.id,
            lat: next.lat,
            lng: next.lng,
            status: 'ONLINE',
            available: true,
            vehicleType: profile?.vehicleType || 'EV_SCOOTER',
          },
        })
        setGpsStatus('live')
      }
      await apiRequest('/api/driver/status', {
        method: 'POST',
        body: { isOnline: nextOnline, status: nextOnline ? 'ONLINE' : 'OFFLINE' },
      })
      await setStoredDutyStatus(nextOnline)
      if (!nextOnline) {
        backgroundTrackingStartedRef.current = false
        await stopBackgroundDriverLocation()
      }
      setOnline(nextOnline)
      if (nextOnline) await loadOffers()
      else setOffers([])
    } catch (dutyError) {
      setGpsStatus('error')
      setError(dutyError instanceof Error ? dutyError.message : 'Unable to change duty status.')
    } finally {
      setBusyKey('')
    }
  }

  async function acceptOffer(offer: DriverOffer) {
    if (!user || busyKey) return
    setBusyKey(`offer-${offer.id}`)
    setError('')
    try {
      const response = await apiRequest<{ order: DriverOrder }>('/api/driver/accept', {
        method: 'POST',
        body: { requestId: offer.id, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) },
      })
      setOrders((current) => [response.order, ...current.filter((order) => order.id !== offer.id)])
      setOffers([])
      setNotice('Delivery accepted. Navigate to the restaurant for pickup.')
      setTab('home')
      await loadData()
    } catch (acceptError) {
      setOffers((current) => current.filter((item) => item.id !== offer.id))
      setError(
        acceptError instanceof Error ? acceptError.message : 'This offer is no longer available.'
      )
    } finally {
      setBusyKey('')
    }
  }

  async function advanceTrip() {
    if (!activeOrder || busyKey) return
    const status = activeOrder.status === 'picked_up' ? 'out_for_delivery' : 'picked_up'
    setBusyKey('advance')
    setError('')
    try {
      const response = await apiRequest<{ order: DriverOrder }>('/api/orders', {
        method: 'PATCH',
        body: { orderId: activeOrder.id, status },
      })
      setOrders((current) => [
        response.order,
        ...current.filter((order) => order.id !== activeOrder.id),
      ])
      setNotice(
        status === 'picked_up'
          ? 'Pickup confirmed. Check the package before leaving.'
          : 'Customer has been notified that you are on the way.'
      )
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : 'Unable to update delivery.')
    } finally {
      setBusyKey('')
    }
  }

  async function completeDelivery(otp: string) {
    if (!activeOrder || busyKey) return
    setBusyKey('complete')
    setError('')
    try {
      await apiRequest('/api/orders', {
        method: 'PATCH',
        body: { orderId: activeOrder.id, status: 'delivered', otp, delivery_otp: otp },
      })
      setOtpOpen(false)
      setNotice('Delivery completed. Great work!')
      await loadData()
      await loadOffers()
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : 'Unable to verify the delivery OTP.'
      )
    } finally {
      setBusyKey('')
    }
  }

  async function saveProfile(next: DriverProfile) {
    setBusyKey('profile')
    setError('')
    try {
      const response = await apiRequest<{ profile: DriverProfile }>('/api/driver/profile', {
        method: 'PUT',
        body: {
          name: next.name,
          phone: next.phone,
          address: next.address,
          vehicleType: next.vehicleType,
          licensePlate: next.licensePlate,
        },
      })
      setProfile({ ...next, ...response.profile })
      setUser((current) => (current ? { ...current, ...response.profile } : current))
      setNotice('Profile updated successfully.')
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to save profile.')
    } finally {
      setBusyKey('')
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    await apiRequest('/api/user/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword },
    })
  }

  async function addUpi(vpa: string, bankName: string) {
    const response = await apiRequest<{ account: UpiAccount }>('/api/driver/upi', {
      method: 'POST',
      body: { vpa, bankName, isPrimary: upi.length === 0 },
    })
    setUpi((current) => [...current, response.account])
    setNotice('UPI payout account added.')
  }

  async function primaryUpi(id: string) {
    await apiRequest('/api/driver/upi', { method: 'PUT', body: { id, isPrimary: true } })
    setUpi((current) => current.map((account) => ({ ...account, isPrimary: account.id === id })))
  }

  async function deleteUpi(id: string) {
    await apiRequest(`/api/driver/upi?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setUpi((current) => current.filter((account) => account.id !== id))
  }

  async function cashout(amount: number) {
    setBusyKey('cashout')
    try {
      await apiRequest('/api/driver/payouts', { method: 'POST', body: { amount } })
      const response = await apiRequest<{ payoutLogs: PayoutLog[] }>('/api/driver/payouts')
      setPayouts(response.payoutLogs || [])
      setNotice('Payout request submitted.')
    } finally {
      setBusyKey('')
    }
  }

  async function toggleNotifications(enabled: boolean) {
    if (notificationBusy) return
    setNotificationBusy(true)
    setError('')
    try {
      const granted = enabled ? await requestNotificationPermission() : false
      const finalValue = enabled && granted
      await setNotificationPreference(finalValue)
      if (!finalValue) await unregisterDriverPushNotifications()
      setNotificationsEnabled(finalValue)
      if (enabled && !granted) {
        setError('Notification permission was not granted. You can enable it in device settings.')
      } else {
        setNotice(
          finalValue ? 'Delivery notifications enabled.' : 'Delivery notifications disabled.'
        )
      }
    } catch (notificationError) {
      setNotificationsEnabled(false)
      await setNotificationPreference(false).catch(() => undefined)
      setError(
        notificationError instanceof Error
          ? notificationError.message
          : 'Unable to change notification settings.'
      )
    } finally {
      setNotificationBusy(false)
    }
  }

  async function refreshUpdateStatus() {
    if (updateCheckRunningRef.current) return
    updateCheckRunningRef.current = true
    setCheckingUpdate(true)
    setUpdateError('')
    try {
      const update = await checkForDriverUpdate()
      setAvailableUpdate(update)
      if (update)
        await notifyDriverAppUpdate(
          `CRAVE Driver ${update.versionName} available`,
          update.releaseNotes
        )
    } catch (updateCheckError) {
      setUpdateError(
        updateCheckError instanceof Error
          ? updateCheckError.message
          : 'Unable to check for updates.'
      )
    } finally {
      setCheckingUpdate(false)
      updateCheckRunningRef.current = false
    }
  }

  async function installUpdate() {
    if (!availableUpdate || installingUpdate) return
    setInstallingUpdate(true)
    setUpdateError('')
    try {
      await installDriverUpdate(availableUpdate)
    } catch (updateInstallError) {
      setUpdateError(
        updateInstallError instanceof Error
          ? updateInstallError.message
          : 'The update could not be installed.'
      )
    } finally {
      setInstallingUpdate(false)
    }
  }

  async function logout() {
    if (activeOrder) {
      setTab('home')
      setError('Complete the active delivery before signing out.')
      return
    }
    if (online)
      await apiRequest('/api/driver/status', {
        method: 'POST',
        body: { isOnline: false, status: 'OFFLINE' },
      }).catch(() => undefined)
    await stopBackgroundDriverLocation()
    await unregisterDriverPushNotifications()
    await apiRequest('/api/auth/logout', { method: 'POST', body: { token: getAuthToken() } }).catch(
      () => undefined
    )
    await clearAuthToken()
    await setStoredDutyStatus(false)
    setUser(null)
    setProfile(null)
    setOnline(false)
    setOrders([])
    setOffers([])
    setTab('home')
  }

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (booting)
    return (
      <main className="splash-screen">
        <img className="brand-mark" src={appLogo} alt="Crave" />
        <div className="splash-loader" />
      </main>
    )
  if (!user || !profile) return <LoginScreen onLogin={login} />

  const todayEarnings = completedTrips.reduce((total, trip) => total + Number(trip.total || 0), 0)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-mark" src={appLogo} alt="Crave" />
          <div>
            <strong>crave.</strong>
            <small>driver</small>
          </div>
        </div>
        <div className="header-status">
          <span className={`connection-pill ${networkConnected && wsConnected ? 'connected' : ''}`}>
            <Icon name={networkConnected && wsConnected ? 'wifi' : 'offline'} />
            {networkConnected && wsConnected ? 'Live' : networkConnected ? 'Syncing' : 'Offline'}
          </span>
          <button
            className={`duty-toggle ${online ? 'online' : ''}`}
            disabled={busyKey === 'duty'}
            onClick={() => toggleDuty(!online)}
          >
            <span />
            <b>{online ? 'Online' : 'Offline'}</b>
          </button>
        </div>
      </header>
      {(error || notice) && (
        <div className={`app-banner ${error ? 'error' : 'success'}`}>
          <span>{error || notice}</span>
          <button
            onClick={() => {
              setError('')
              setNotice('')
            }}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      <main className="app-content">
        {tab === 'home' && (
          <section className="page-section home-page">
            <div className="driver-welcome">
              <div>
                <span className="eyebrow">
                  {online ? 'You are on duty' : 'You are currently offline'}
                </span>
                <h1>
                  {online
                    ? `Ride safe, ${profile.name.split(' ')[0]}.`
                    : `Ready when you are, ${profile.name.split(' ')[0]}.`}
                </h1>
                <p>
                  {online
                    ? 'New delivery offers will appear here in real time.'
                    : 'Go online to share GPS and receive nearby delivery offers.'}
                </p>
              </div>
              <span className={`gps-orb ${gpsStatus}`}>
                <Icon name={gpsStatus === 'live' ? 'navigation' : 'pin'} />
                <small>
                  {gpsStatus === 'live'
                    ? `GPS ±${Math.round(coords?.accuracy || 0)}m`
                    : gpsStatus === 'acquiring'
                      ? 'Finding GPS'
                      : 'GPS off'}
                </small>
              </span>
            </div>
            <div className="home-stats">
              <article>
                <span>Today&apos;s earnings</span>
                <strong>{money(todayEarnings)}</strong>
              </article>
              <article>
                <span>Completed trips</span>
                <strong>{completedTrips.length}</strong>
              </article>
              <article>
                <span>Live offers</span>
                <strong>{online ? offers.length : '—'}</strong>
              </article>
            </div>
            {activeOrder ? (
              <>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">Current job</span>
                    <h2>Active delivery</h2>
                  </div>
                </div>
                <ActiveTripCard
                  order={activeOrder}
                  busy={busyKey === 'advance' || busyKey === 'complete'}
                  onAdvance={advanceTrip}
                  onComplete={() => setOtpOpen(true)}
                />
              </>
            ) : online ? (
              <>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">Nearby queue</span>
                    <h2>Delivery offers</h2>
                  </div>
                  <button className="refresh-button" onClick={() => loadOffers()}>
                    <Icon name="refresh" /> Refresh
                  </button>
                </div>
                <div className="offer-grid">
                  {offers.length > 0 ? (
                    offers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        busy={busyKey === `offer-${offer.id}`}
                        onAccept={acceptOffer}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon="bike"
                      title="Waiting for the next order"
                      text="Stay online. A live alert will appear as soon as an eligible order is ready."
                    />
                  )}
                </div>
              </>
            ) : (
              <article className="offline-card">
                <span>
                  <Icon name="bike" />
                </span>
                <h2>Start accepting deliveries</h2>
                <p>
                  Going online requests precise location access so Crave can route nearby orders and
                  keep customers updated.
                </p>
                <button className="primary-button" onClick={() => toggleDuty(true)}>
                  Go online
                </button>
              </article>
            )}
          </section>
        )}
        {tab === 'trips' && <TripsPage orders={orders} trips={completedTrips} />}
        {tab === 'earnings' && (
          <EarningsPage
            trips={completedTrips}
            payouts={payouts}
            upi={upi}
            busy={busyKey === 'cashout'}
            onCashout={cashout}
            onAddUpiAccount={() => setTab('account')}
          />
        )}
        {tab === 'account' && (
          <AccountPage
            profile={profile}
            upi={upi}
            notificationsEnabled={notificationsEnabled}
            notificationBusy={notificationBusy}
            busy={busyKey === 'profile'}
            onSaveProfile={saveProfile}
            onChangePassword={changePassword}
            onAddUpi={addUpi}
            onPrimaryUpi={primaryUpi}
            onDeleteUpi={deleteUpi}
            onToggleNotifications={toggleNotifications}
            onTheme={(mode) => {
              setTheme(mode)
              void saveTheme(mode)
            }}
            theme={theme}
            availableUpdate={availableUpdate}
            checkingUpdate={checkingUpdate}
            installingUpdate={installingUpdate}
            updateError={updateError}
            onCheckUpdate={refreshUpdateStatus}
            onInstallUpdate={installUpdate}
            onLogout={logout}
          />
        )}
      </main>
      <nav className="bottom-nav" aria-label="Driver app navigation">
        {NAV_ITEMS.map((item) => (
          <button
            className={tab === item.tab ? 'active' : ''}
            key={item.tab}
            onClick={() => setTab(item.tab)}
          >
            <span>
              <Icon name={item.icon} />
              {item.tab === 'home' && online && offers.length > 0 && !activeOrder && (
                <i>{Math.min(offers.length, 9)}</i>
              )}
            </span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
      {otpOpen && (
        <OtpSheet
          busy={busyKey === 'complete'}
          onClose={() => setOtpOpen(false)}
          onSubmit={completeDelivery}
        />
      )}
      {permissionSheet && (
        <PermissionSheet
          onClose={() => setPermissionSheet(false)}
          onDone={() => {
            void markPermissionSheetSeen()
            setPermissionSheet(false)
          }}
        />
      )}
    </div>
  )
}
