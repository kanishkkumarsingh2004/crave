import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { SplashScreen } from '@capacitor/splash-screen'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import appLogo from '../assets/logo.svg'
import {
  ApiError,
  apiRequest,
  clearAuthToken,
  COOKIE_SESSION_TOKEN,
  getApiOrigin,
  restoreAuthToken,
  saveAuthToken,
} from './api'
import { checkForAdminUpdate, installAdminUpdate, type AdminUpdate } from './update'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'

type Tab = 'overview' | 'orders' | 'payments' | 'partners' | 'settings'
type IconName =
  | 'home'
  | 'orders'
  | 'store'
  | 'settings'
  | 'refresh'
  | 'wifi'
  | 'offline'
  | 'download'
  | 'logout'
  | 'users'
  | 'money'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

interface AdminStats {
  weeklyGross?: number
  weeklyRevenue?: number
  orderCount?: number
  totalCommission?: number
  customerCount?: number
  vendorCount?: number
  driverCount?: number
  restaurantCount?: number
  liveDevices?: number
}

interface OrderRecord {
  id: string
  status?: string
  customer_name?: string
  restaurant_name?: string
  total_amount?: number | string
  created_at?: string
}

interface RestaurantRecord {
  id: string
  owner_id?: string | null
  name: string
  cuisine?: string
  phone?: string
  address?: string
  is_open?: boolean
  commission_rate?: number | string
  commercial_model?: 'commission' | 'markup' | 'hybrid'
  markup_rate?: number | string
  fixed_commission?: number | string
  fixed_markup?: number | string
}

interface PartnerForm {
  ownerName: string
  email: string
  password: string
  name: string
  cuisine: string
  phone: string
  address: string
  commercialModel: 'commission' | 'markup' | 'hybrid'
  commissionRate: string
  markupRate: string
  fixedCommission: string
  fixedMarkup: string
}

const emptyPartnerForm: PartnerForm = {
  ownerName: '',
  email: '',
  password: '',
  name: '',
  cuisine: '',
  phone: '',
  address: '',
  commercialModel: 'commission',
  commissionRate: '15',
  markupRate: '0',
  fixedCommission: '0',
  fixedMarkup: '0',
}

function commercialSummary(restaurant: RestaurantRecord) {
  const model = restaurant.commercial_model || 'commission'
  const commission = `${Number(restaurant.commission_rate || 0)}% + ₹${Number(
    restaurant.fixed_commission || 0
  )}`
  const markup = `${Number(restaurant.markup_rate || 0)}% + ₹${Number(
    restaurant.fixed_markup || 0
  )}`
  if (model === 'hybrid') return `Hybrid · commission ${commission} · markup ${markup}`
  if (model === 'markup') return `Markup · ${markup}`
  return `Commission · ${commission}`
}

interface PaymentReview {
  id: string
  order_id: string
  customer_vpa?: string | null
  utr_ref: string
  amount: number | string
  status: 'pending' | 'verified' | 'rejected'
  created_at?: string
}

interface DashboardData {
  stats: AdminStats
  orders: OrderRecord[]
  restaurants: RestaurantRecord[]
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <path d="M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7" />,
    orders: <path d="M6 3h12l2 5H4l2-5ZM5 8v13h14V8M9 12h6M9 16h6" />,
    store: <path d="M4 10v11h16V10M3 4h18l-2 6H5L3 4ZM9 21v-6h6v6" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4.8l-.4 3a8 8 0 0 0-1.8 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.8 1l.4 3h4.8l.4-3a8 8 0 0 0 1.8-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z" />
      </>
    ),
    refresh: <path d="M20 6v5h-5M18.5 9A8 8 0 1 0 20 15" />,
    wifi: <path d="M4 9a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 17a3 3 0 0 1 4 0M12 20h.01" />,
    offline: (
      <path d="m3 3 18 18M7 13a8 8 0 0 1 4-2M4 9a12 12 0 0 1 3-2M14 11a8 8 0 0 1 3 2M10 17a3 3 0 0 1 3 0" />
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />,
    logout: <path d="m10 17 5-5-5-5m5 5H3m11-9h7v18h-7" />,
    users: (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8m13 18v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    ),
    money: <path d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {paths[name]}
    </svg>
  )
}

function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function label(value = ''): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-glow" />
      <section className="login-card">
        <div className="brand-lockup login-brand">
          <img src={appLogo} alt="Crave" />
          <div>
            <strong>crave.</strong>
            <small>admin control</small>
          </div>
        </div>
        <span className="eyebrow">Operations command centre</span>
        <h1>Run Crave from one app.</h1>
        <p>Live orders, partner health, platform numbers and secure administration.</p>
        <form onSubmit={submit}>
          <label>
            Admin email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Open admin app'}
          </button>
        </form>
      </section>
    </main>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
}

const ADMIN_ANDROID_APK_URL =
  'https://raw.githubusercontent.com/kanishkkumarsingh2004/crave/main/android-builds/crave-admin-debug.apk'

function DownloadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="partner-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="partner-sheet-heading">
          <div>
            <span className="eyebrow">Get the app</span>
            <h2 id="download-sheet-title">Download Crave Admin</h2>
          </div>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="partner-form-help">
          Install the native admin app for faster operations and live push alerts.
        </p>
        <div className="partner-form-actions" style={{ flexDirection: 'column', gap: 10 }}>
          <a
            className="primary-button"
            href={ADMIN_ANDROID_APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="crave-admin-debug.apk"
          >
            <Icon name="download" /> Download for Android
          </a>
          <button className="secondary-button" disabled>
            iOS — Coming soon
          </button>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<DashboardData>({ stats: {}, orders: [], restaurants: [] })
  const [payments, setPayments] = useState<PaymentReview[]>([])
  const [paymentBusy, setPaymentBusy] = useState('')
  const [networkConnected, setNetworkConnected] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [availableUpdate, setAvailableUpdate] = useState<AdminUpdate | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [partnerMode, setPartnerMode] = useState<'add' | 'edit' | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<RestaurantRecord | null>(null)
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(emptyPartnerForm)
  const [partnerBusy, setPartnerBusy] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const updateCheckRunningRef = useRef(false)

  const activeOrders = useMemo(
    () =>
      data.orders.filter(
        (order) => !['delivered', 'completed', 'cancelled'].includes(order.status || '')
      ),
    [data.orders]
  )
  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'pending'),
    [payments]
  )

  useEffect(() => {
    void bootstrap()
    void refreshUpdateStatus()
    void loadTheme().then(setTheme)
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(theme)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])

  useEffect(() => {
    if (tab === 'settings') void refreshUpdateStatus()
  }, [tab])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => void loadDashboard(false), 20_000)
    return () => window.clearInterval(timer)
  }, [user?.id])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handles: Array<{ remove: () => Promise<void> }> = []
    void Network.getStatus().then(({ connected }) => setNetworkConnected(connected))
    void Promise.all([
      Network.addListener('networkStatusChange', ({ connected }) => setNetworkConnected(connected)),
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && user) void loadDashboard(false)
      }),
      CapacitorApp.addListener('backButton', () => {
        if (partnerMode) setPartnerMode(null)
        else if (tab !== 'overview') setTab('overview')
        else void CapacitorApp.minimizeApp()
      }),
    ]).then((listeners) => handles.push(...listeners))
    return () => handles.forEach((handle) => void handle.remove())
  }, [user?.id, tab, partnerMode])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3600)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function bootstrap() {
    try {
      const token = await restoreAuthToken()
      if (!token) return
      const response = await apiRequest<{ authenticated: boolean; user: AdminUser }>(
        '/api/auth/me',
        {
          token,
        }
      )
      if (response.authenticated && response.user?.role === 'admin') {
        setUser(response.user)
        await loadDashboard(false)
      } else {
        await clearAuthToken()
      }
    } catch (bootstrapError) {
      if (bootstrapError instanceof ApiError && bootstrapError.status === 401) {
        await clearAuthToken()
      }
    } finally {
      setBooting(false)
      await SplashScreen.hide().catch(() => undefined)
    }
  }

  async function login(email: string, password: string) {
    const response = await apiRequest<{ token?: string; user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      token: '',
    })
    if (response.user?.role !== 'admin')
      throw new Error('This app requires an administrator account.')
    let sessionUser = response.user
    let sessionToken = response.token
    if (!sessionToken) {
      const cookieSession = await apiRequest<{ authenticated: boolean; user?: AdminUser }>(
        '/api/auth/me',
        { token: '' }
      )
      if (!cookieSession.authenticated || !cookieSession.user) {
        throw new Error('Sign-in succeeded, but the secure app session could not be restored.')
      }
      sessionUser = cookieSession.user
      sessionToken = COOKIE_SESSION_TOKEN
    }
    if (sessionUser.role !== 'admin') throw new Error('This app requires an administrator account.')
    await saveAuthToken(sessionToken)
    setUser(sessionUser)
    await loadDashboard(false)
  }

  async function loadDashboard(showLoader = true) {
    if (showLoader) setRefreshing(true)
    setError('')
    try {
      const [dashboardResult, paymentResult] = await Promise.allSettled([
        apiRequest<DashboardData>('/api/admin/stats'),
        apiRequest<{ reviews?: PaymentReview[] }>('/api/admin/payment-reviews?limit=100'),
      ])
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason
      const response = dashboardResult.value
      setData({
        stats: response.stats || {},
        orders: response.orders || [],
        restaurants: response.restaurants || [],
      })
      if (paymentResult.status === 'fulfilled') {
        setPayments(paymentResult.value.reviews || [])
      } else {
        setError(
          paymentResult.reason instanceof Error
            ? `Operations loaded, but payments could not sync: ${paymentResult.reason.message}`
            : 'Operations loaded, but the payment review queue could not sync.'
        )
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data.')
    } finally {
      if (showLoader) setRefreshing(false)
    }
  }

  async function reviewPayment(payment: PaymentReview, status: 'verified' | 'rejected') {
    if (paymentBusy) return
    if (
      !window.confirm(
        status === 'verified'
          ? `Verify UPI payment ${payment.utr_ref} for ${money(payment.amount)}?`
          : `Reject UPI payment ${payment.utr_ref}?`
      )
    )
      return

    const reason =
      status === 'rejected'
        ? window.prompt('Reason for rejection', 'UPI payment could not be verified')?.trim()
        : undefined
    if (status === 'rejected' && reason == null) return

    const previous = payments
    setPaymentBusy(payment.id)
    setError('')
    setPayments((current) =>
      current.map((entry) => (entry.id === payment.id ? { ...entry, status } : entry))
    )
    try {
      await apiRequest('/api/admin/payment-reviews', {
        method: 'PATCH',
        body: { id: payment.id, orderId: payment.order_id, status, reason },
      })
      setNotice(status === 'verified' ? 'UPI payment verified.' : 'UPI payment rejected.')
      await loadDashboard(false)
    } catch (reviewError) {
      setPayments(previous)
      setError(
        reviewError instanceof Error ? reviewError.message : 'Could not update the payment review.'
      )
    } finally {
      setPaymentBusy('')
    }
  }

  async function refreshUpdateStatus() {
    if (updateCheckRunningRef.current) return
    updateCheckRunningRef.current = true
    setCheckingUpdate(true)
    setUpdateError('')
    try {
      setAvailableUpdate(await checkForAdminUpdate())
    } catch (checkError) {
      setUpdateError(checkError instanceof Error ? checkError.message : 'Unable to check updates.')
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
      await installAdminUpdate(availableUpdate)
    } catch (installError) {
      setUpdateError(
        installError instanceof Error ? installError.message : 'The update could not be installed.'
      )
    } finally {
      setInstallingUpdate(false)
    }
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    setUser(null)
    setData({ stats: {}, orders: [], restaurants: [] })
    setPayments([])
    setTab('overview')
  }

  function openAddPartner() {
    setSelectedPartner(null)
    setPartnerForm(emptyPartnerForm)
    setPartnerMode('add')
  }

  function openEditPartner(restaurant: RestaurantRecord) {
    setSelectedPartner(restaurant)
    setPartnerForm({
      ...emptyPartnerForm,
      name: restaurant.name || '',
      cuisine: restaurant.cuisine || '',
      phone: restaurant.phone || '',
      address: restaurant.address || '',
      commercialModel: restaurant.commercial_model || 'commission',
      commissionRate: String(restaurant.commission_rate ?? 0),
      markupRate: String(restaurant.markup_rate ?? 0),
      fixedCommission: String(restaurant.fixed_commission ?? 0),
      fixedMarkup: String(restaurant.fixed_markup ?? 0),
    })
    setPartnerMode('edit')
  }

  async function savePartner(event: FormEvent) {
    event.preventDefault()
    if (partnerBusy) return
    setPartnerBusy(true)
    setError('')
    try {
      if (partnerMode === 'add') {
        await apiRequest('/api/admin/create-vendor', {
          method: 'POST',
          body: {
            name: partnerForm.ownerName.trim(),
            email: partnerForm.email.trim(),
            password: partnerForm.password,
            storeName: partnerForm.name.trim(),
            cuisine: partnerForm.cuisine.trim() || 'Multi-Cuisine',
            phone: partnerForm.phone.trim(),
            address: partnerForm.address.trim(),
            commercialModel: partnerForm.commercialModel,
            commissionRate: Number(partnerForm.commissionRate),
            markupRate: Number(partnerForm.markupRate),
            fixedCommission: Number(partnerForm.fixedCommission),
            fixedMarkup: Number(partnerForm.fixedMarkup),
            paymentModel: partnerForm.commercialModel === 'markup' ? 'markup' : 'commission',
          },
        })
        setNotice('Restaurant partner added successfully.')
      } else if (selectedPartner) {
        await apiRequest('/api/admin/edit-account', {
          method: 'POST',
          body: {
            id: selectedPartner.owner_id || undefined,
            restaurantId: selectedPartner.id,
            storeName: partnerForm.name.trim(),
            cuisine: partnerForm.cuisine.trim(),
            phone: partnerForm.phone.trim(),
            address: partnerForm.address.trim(),
            commercialModel: partnerForm.commercialModel,
            commissionRate: Number(partnerForm.commissionRate),
            markupRate: Number(partnerForm.markupRate),
            fixedCommission: Number(partnerForm.fixedCommission),
            fixedMarkup: Number(partnerForm.fixedMarkup),
            paymentModel: partnerForm.commercialModel === 'markup' ? 'markup' : 'commission',
          },
        })
        setNotice('Restaurant details updated.')
      }
      setPartnerMode(null)
      setSelectedPartner(null)
      await loadDashboard(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the restaurant.')
    } finally {
      setPartnerBusy(false)
    }
  }

  async function setPartnerSuspended(restaurant: RestaurantRecord) {
    const nextOpen = !restaurant.is_open
    if (
      !window.confirm(
        nextOpen
          ? `Restore ${restaurant.name} and allow it to accept orders?`
          : `Suspend ${restaurant.name} and stop it from accepting orders?`
      )
    )
      return
    const previous = data.restaurants
    setData((current) => ({
      ...current,
      restaurants: current.restaurants.map((entry) =>
        entry.id === restaurant.id ? { ...entry, is_open: nextOpen } : entry
      ),
    }))
    try {
      await apiRequest('/api/admin/edit-account', {
        method: 'POST',
        body: {
          id: restaurant.owner_id || undefined,
          restaurantId: restaurant.id,
          isOpen: nextOpen,
        },
      })
      setNotice(nextOpen ? 'Restaurant restored.' : 'Restaurant suspended.')
      await loadDashboard(false)
    } catch (suspendError) {
      setData((current) => ({ ...current, restaurants: previous }))
      setError(
        suspendError instanceof Error ? suspendError.message : 'Could not change restaurant status.'
      )
    }
  }

  async function deletePartner(restaurant: RestaurantRecord) {
    if (
      !window.confirm(
        `Delete ${restaurant.name}? If it has order history, it will be safely deactivated instead.`
      )
    )
      return
    setPartnerBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ action?: string; message?: string }>(
        '/api/admin/delete-vendor',
        {
          method: 'POST',
          body: { vendorId: restaurant.id, userId: restaurant.owner_id || undefined },
        }
      )
      setNotice(result.message || 'Restaurant removed.')
      await loadDashboard(false)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Could not remove the restaurant.'
      )
    } finally {
      setPartnerBusy(false)
    }
  }

  if (booting) {
    return (
      <main className="splash-screen">
        <img src={appLogo} alt="Crave" />
        <strong>crave admin</strong>
        <span />
      </main>
    )
  }
  if (!user) return <LoginScreen onLogin={login} />

  const stats = data.stats
  const nav: Array<{ id: Tab; label: string; icon: IconName; badge?: number }> = [
    { id: 'overview', label: 'Home', icon: 'home' },
    { id: 'orders', label: 'Orders', icon: 'orders', badge: activeOrders.length },
    { id: 'payments', label: 'Payments', icon: 'money', badge: pendingPayments.length },
    { id: 'partners', label: 'Partners', icon: 'store' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img src={appLogo} alt="Crave" />
          <div>
            <strong>crave admin</strong>
            <small>Operations control</small>
          </div>
        </div>
        <button className="connection-chip" onClick={() => void loadDashboard()}>
          <Icon name={networkConnected ? 'wifi' : 'offline'} />
          {refreshing ? 'Syncing' : networkConnected ? 'Live' : 'Offline'}
        </button>
        <button className="connection-chip" onClick={() => setShowDownload(true)}>
          <Icon name="download" /> App
        </button>
      </header>

      {!networkConnected && <div className="offline-banner">No internet connection</div>}
      {error && (
        <button className="error-banner" onClick={() => void loadDashboard()}>
          {error}
        </button>
      )}

      <main className="app-content">
        {tab === 'overview' && (
          <section className="page">
            <article className="hero-card">
              <span className="eyebrow">Live platform</span>
              <h1>Everything is in view.</h1>
              <p>{activeOrders.length} active orders currently need platform attention.</p>
              <button className="primary-button" onClick={() => void loadDashboard()}>
                <Icon name="refresh" /> Refresh operations
              </button>
            </article>
            {pendingPayments.length > 0 && (
              <button className="payment-alert" onClick={() => setTab('payments')}>
                <span>
                  <Icon name="money" />
                </span>
                <div>
                  <strong>{pendingPayments.length} UPI payment awaiting review</strong>
                  <small>Open the manual verification queue</small>
                </div>
                <b>Review</b>
              </button>
            )}
            <div className="stats-grid">
              <article>
                <span>Orders</span>
                <strong>{stats.orderCount || data.orders.length}</strong>
              </article>
              <article>
                <span>Revenue</span>
                <strong>{money(stats.weeklyRevenue)}</strong>
              </article>
              <article>
                <span>Restaurants</span>
                <strong>{stats.restaurantCount || data.restaurants.length}</strong>
              </article>
              <article>
                <span>Live users</span>
                <strong>{stats.liveDevices || 0}</strong>
              </article>
            </div>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Command queue</span>
                <h2>Recent orders</h2>
              </div>
              <button onClick={() => setTab('orders')}>View all</button>
            </div>
            <div className="record-list">
              {data.orders.slice(0, 5).map((order) => (
                <OrderCard order={order} key={order.id} />
              ))}
              {data.orders.length === 0 && <EmptyState text="No orders are available yet." />}
            </div>
          </section>
        )}

        {tab === 'orders' && (
          <section className="page">
            <div className="page-heading">
              <span className="eyebrow">Live operations</span>
              <h1>Orders</h1>
              <p>Monitor every order across the platform.</p>
            </div>
            <div className="record-list">
              {data.orders.map((order) => (
                <OrderCard order={order} key={order.id} />
              ))}
              {data.orders.length === 0 && <EmptyState text="No orders are available yet." />}
            </div>
          </section>
        )}

        {tab === 'payments' && (
          <section className="page">
            <div className="page-heading">
              <span className="eyebrow">Manual UPI verification</span>
              <h1>Payments</h1>
              <p>Match each UTR with the bank transaction before approving the order.</p>
            </div>
            <div className="payment-list">
              {payments.map((payment) => (
                <article className={`payment-card ${payment.status}`} key={payment.id}>
                  <div className="payment-card-head">
                    <div>
                      <span>UTR</span>
                      <h3>{payment.utr_ref}</h3>
                    </div>
                    <strong>{money(payment.amount)}</strong>
                  </div>
                  <div className="payment-details">
                    <span>
                      Order <b>#{payment.order_id.slice(-8).toUpperCase()}</b>
                    </span>
                    <span>
                      Customer UPI <b>{payment.customer_vpa || 'Not provided'}</b>
                    </span>
                    <span>
                      Submitted{' '}
                      <b>
                        {payment.created_at
                          ? new Date(payment.created_at).toLocaleString()
                          : 'Just now'}
                      </b>
                    </span>
                  </div>
                  {payment.status === 'pending' ? (
                    <div className="payment-actions">
                      <button
                        className="reject-button"
                        disabled={paymentBusy === payment.id}
                        onClick={() => void reviewPayment(payment, 'rejected')}
                      >
                        Reject
                      </button>
                      <button
                        className="primary-button"
                        disabled={paymentBusy === payment.id}
                        onClick={() => void reviewPayment(payment, 'verified')}
                      >
                        {paymentBusy === payment.id ? 'Saving…' : 'Verify payment'}
                      </button>
                    </div>
                  ) : (
                    <div className={`review-status ${payment.status}`}>
                      {payment.status === 'verified' ? 'Payment verified' : 'Payment rejected'}
                    </div>
                  )}
                </article>
              ))}
              {payments.length === 0 && <EmptyState text="No UPI payments need review." />}
            </div>
          </section>
        )}

        {tab === 'partners' && (
          <section className="page">
            <div className="page-heading partner-page-heading">
              <div>
                <span className="eyebrow">Partner network</span>
                <h1>Restaurants</h1>
                <p>Live status and commercial overview.</p>
              </div>
              <button className="add-partner-button" onClick={openAddPartner}>
                <b>+</b> Add restaurant
              </button>
            </div>
            <div className="partner-grid">
              {data.restaurants.map((restaurant) => (
                <article className="partner-card" key={restaurant.id}>
                  <span className={restaurant.is_open ? 'status-dot open' : 'status-dot'} />
                  <div>
                    <h3>{restaurant.name}</h3>
                    <p>{restaurant.cuisine || 'Restaurant partner'}</p>
                  </div>
                  <strong>{restaurant.is_open ? 'Open' : 'Offline'}</strong>
                  <small>{commercialSummary(restaurant)}</small>
                  <div className="partner-actions">
                    <button onClick={() => openEditPartner(restaurant)}>Edit</button>
                    <button
                      className="suspend"
                      onClick={() => void setPartnerSuspended(restaurant)}
                    >
                      {restaurant.is_open ? 'Suspend' : 'Restore'}
                    </button>
                    <button
                      className="delete"
                      disabled={partnerBusy}
                      onClick={() => void deletePartner(restaurant)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {data.restaurants.length === 0 && <EmptyState text="No restaurant partners found." />}
            </div>
          </section>
        )}

        {tab === 'settings' && (
          <section className="page settings-page">
            <div className="page-heading">
              <span className="eyebrow">Application control</span>
              <h1>Settings</h1>
              <p>Admin access, backend health and app updates.</p>
            </div>
            <article className="settings-card profile-card">
              <span className="profile-avatar">{user.name?.slice(0, 1).toUpperCase() || 'A'}</span>
              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <small>Platform administrator</small>
              </div>
            </article>
            <article className="settings-card">
              <div className="settings-title">
                <span>
                  <Icon name="wifi" />
                </span>
                <div>
                  <h3>Production backend</h3>
                  <p>{getApiOrigin()}</p>
                </div>
              </div>
              <div className={`health-pill ${networkConnected ? 'healthy' : ''}`}>
                {networkConnected ? 'Connected' : 'Offline'}
              </div>
            </article>
            <article className="settings-card">
              <div className="settings-title">
                <span className="theme-symbol">◐</span>
                <div>
                  <h3>Appearance</h3>
                  <p>Choose a light, dark, or device-controlled theme.</p>
                </div>
              </div>
              <div className="theme-control" role="group" aria-label="Admin app theme">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={theme === mode ? 'active' : ''}
                    onClick={() => {
                      setTheme(mode)
                      void saveTheme(mode)
                    }}
                  >
                    {label(mode)}
                  </button>
                ))}
              </div>
            </article>
            <article className={`settings-card software-card ${availableUpdate ? 'ready' : ''}`}>
              <div className="settings-title">
                <span>
                  <Icon name="download" />
                </span>
                <div>
                  <h3>Admin app update</h3>
                  <p>
                    {checkingUpdate
                      ? 'Checking for the latest admin app…'
                      : availableUpdate
                        ? `Version ${availableUpdate.versionName} is available. ${availableUpdate.releaseNotes}`
                        : updateError || 'You are using the latest available version.'}
                  </p>
                </div>
              </div>
              <div className="software-actions">
                <button
                  className="secondary-button"
                  disabled={checkingUpdate || installingUpdate}
                  onClick={() => void refreshUpdateStatus()}
                >
                  {checkingUpdate ? 'Checking…' : 'Check again'}
                </button>
                <button
                  className="primary-button"
                  disabled={!availableUpdate || checkingUpdate || installingUpdate}
                  onClick={() => void installUpdate()}
                >
                  {installingUpdate
                    ? 'Opening installer…'
                    : availableUpdate
                      ? `Update to ${availableUpdate.versionName}`
                      : 'App is up to date'}
                </button>
              </div>
              {updateError && availableUpdate && (
                <div className="software-error">{updateError}</div>
              )}
            </article>
            <button className="logout-button" onClick={() => void logout()}>
              <Icon name="logout" /> Sign out of admin app
            </button>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Admin app navigation">
        {nav.map((item) => (
          <button
            className={tab === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => setTab(item.id)}
          >
            <span>
              <Icon name={item.icon} />
              {Boolean(item.badge) && <i>{Math.min(item.badge || 0, 99)}</i>}
            </span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
      {partnerMode && (
        <div className="modal-backdrop" onClick={() => !partnerBusy && setPartnerMode(null)}>
          <section
            className="partner-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="partner-sheet-heading">
              <div>
                <span className="eyebrow">Partner management</span>
                <h2 id="partner-form-title">
                  {partnerMode === 'add' ? 'Add restaurant' : 'Edit restaurant'}
                </h2>
              </div>
              <button onClick={() => setPartnerMode(null)} aria-label="Close">
                ×
              </button>
            </div>
            <form className="partner-form" onSubmit={savePartner}>
              {partnerMode === 'add' && (
                <>
                  <label>
                    Owner name
                    <input
                      value={partnerForm.ownerName}
                      onChange={(event) =>
                        setPartnerForm((form) => ({ ...form, ownerName: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Owner email
                    <input
                      type="email"
                      value={partnerForm.email}
                      onChange={(event) =>
                        setPartnerForm((form) => ({ ...form, email: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      minLength={8}
                      value={partnerForm.password}
                      onChange={(event) =>
                        setPartnerForm((form) => ({ ...form, password: event.target.value }))
                      }
                      required
                    />
                  </label>
                </>
              )}
              <label>
                Restaurant name
                <input
                  value={partnerForm.name}
                  onChange={(event) =>
                    setPartnerForm((form) => ({ ...form, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Cuisine
                <input
                  value={partnerForm.cuisine}
                  onChange={(event) =>
                    setPartnerForm((form) => ({ ...form, cuisine: event.target.value }))
                  }
                  placeholder="Multi-Cuisine"
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  value={partnerForm.phone}
                  onChange={(event) =>
                    setPartnerForm((form) => ({ ...form, phone: event.target.value }))
                  }
                />
              </label>
              <label>
                Address
                <textarea
                  value={partnerForm.address}
                  onChange={(event) =>
                    setPartnerForm((form) => ({ ...form, address: event.target.value }))
                  }
                />
              </label>
              <label className="commercial-model-field">
                Commercial model
                <select
                  value={partnerForm.commercialModel}
                  onChange={(event) =>
                    setPartnerForm((form) => ({
                      ...form,
                      commercialModel: event.target.value as PartnerForm['commercialModel'],
                    }))
                  }
                >
                  <option value="commission">Commission</option>
                  <option value="markup">Markup</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              {partnerForm.commercialModel !== 'markup' && (
                <div className="commercial-fields">
                  <label>
                    Commission (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={partnerForm.commissionRate}
                      onChange={(event) =>
                        setPartnerForm((form) => ({
                          ...form,
                          commissionRate: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Fixed commission (₹)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={partnerForm.fixedCommission}
                      onChange={(event) =>
                        setPartnerForm((form) => ({
                          ...form,
                          fixedCommission: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              )}
              {partnerForm.commercialModel !== 'commission' && (
                <div className="commercial-fields">
                  <label>
                    Markup (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={partnerForm.markupRate}
                      onChange={(event) =>
                        setPartnerForm((form) => ({ ...form, markupRate: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Fixed markup (₹)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={partnerForm.fixedMarkup}
                      onChange={(event) =>
                        setPartnerForm((form) => ({ ...form, fixedMarkup: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
              )}
              <div className="partner-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPartnerMode(null)}
                  disabled={partnerBusy}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={partnerBusy}>
                  {partnerBusy
                    ? 'Saving…'
                    : partnerMode === 'add'
                      ? 'Add restaurant'
                      : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {notice && <div className="toast">{notice}</div>}
      <DownloadSheet open={showDownload} onClose={() => setShowDownload(false)} />
    </div>
  )
}

function OrderCard({ order }: { order: OrderRecord }) {
  return (
    <article className="order-card">
      <div>
        <span>{order.id.slice(-8).toUpperCase()}</span>
        <h3>{order.restaurant_name || 'Restaurant order'}</h3>
        <p>{order.customer_name || 'Crave customer'}</p>
      </div>
      <div className="order-meta">
        <strong>{money(order.total_amount)}</strong>
        <span>{label(order.status)}</span>
      </div>
    </article>
  )
}
