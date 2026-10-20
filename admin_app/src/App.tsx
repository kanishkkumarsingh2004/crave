import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { SplashScreen } from '@capacitor/splash-screen'
import { FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
import { initializeNativeAppearance, notifyAdminAppUpdate } from './native'
import type { AddressMapPoint } from './AddressMap'

const AddressMap = lazy(() => import('./AddressMap'))
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

type Tab = 'overview' | 'orders' | 'payments' | 'partners' | 'xp-store' | 'settings'
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
  | 'bell'
  | 'package'
  | 'camera'
  | 'lock'

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
  latitude?: number | string
  longitude?: number | string
  is_open?: boolean
  commission_rate?: number | string
  commercial_model?: 'commission' | 'markup' | 'hybrid'
  markup_rate?: number | string
  fixed_commission?: number | string
  fixed_markup?: number | string
}

interface XPProduct {
  id: string
  name: string
  category: string
  unit: string
  price: number | string
  mrp: number | string
  image?: string | null
  in_stock: boolean
  stock_count: number
  sku_code: string
  barcode?: string | null
}

interface XPProductForm {
  name: string
  category: string
  unit: string
  price: string
  mrp: string
  image: string
  stockCount: string
  barcode: string
  inStock: boolean
}

interface PartnerForm {
  ownerName: string
  email: string
  password: string
  name: string
  cuisine: string
  phone: string
  address: string
  latitude: string
  longitude: string
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
  latitude: '',
  longitude: '',
  commercialModel: 'commission',
  commissionRate: '0',
  markupRate: '0',
  fixedCommission: '0',
  fixedMarkup: '0',
}

const emptyXPProductForm: XPProductForm = {
  name: '',
  category: 'Grocery Essentials',
  unit: '1 Pack',
  price: '',
  mrp: '',
  image: '',
  stockCount: '50',
  barcode: '',
  inStock: true,
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
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    package: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.5" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    lock: <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10ZM12 14v3" />,
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

interface PasswordFieldProps {
  label: string
  value: string
  placeholder: string
  autoComplete: string
  visible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
  minLength?: number
  maxLength?: number
}

function PasswordField({
  label,
  value,
  placeholder,
  autoComplete,
  visible,
  onChange,
  onToggleVisibility,
  minLength,
  maxLength,
}: PasswordFieldProps) {
  return (
    <label className="change-password-label">
      {label}
      <span className="change-password-field">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
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
  const [mapPoint, setMapPoint] = useState<AddressMapPoint | null>(null)
  const [partnerBusy, setPartnerBusy] = useState(false)
  const [xpProducts, setXPProducts] = useState<XPProduct[]>([])
  const [xpLoading, setXPLoading] = useState(false)
  const [xpSearch, setXPSearch] = useState('')
  const [xpFormOpen, setXPFormOpen] = useState(false)
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)
  const [xpEditingId, setXPEditingId] = useState<string | null>(null)
  const [xpForm, setXPForm] = useState<XPProductForm>(emptyXPProductForm)
  const [xpBusy, setXPBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const updateCheckRunningRef = useRef(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

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
  const filteredXPProducts = useMemo(() => {
    const query = xpSearch.trim().toLowerCase()
    if (!query) return xpProducts
    return xpProducts.filter((product) =>
      [product.name, product.category, product.unit, product.sku_code, product.barcode || ''].some(
        (value) => value.toLowerCase().includes(query)
      )
    )
  }, [xpProducts, xpSearch])

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.targetTouches[0]?.clientX ?? 0
    touchEndX.current = touchStartX.current
  }

  function handleTouchMove(event: React.TouchEvent) {
    touchEndX.current = event.changedTouches[0]?.clientX ?? touchEndX.current
  }

  function handleTouchEnd(event: React.TouchEvent) {
    touchEndX.current = event.changedTouches[0]?.clientX ?? touchEndX.current
    const distance = touchStartX.current - touchEndX.current
    if (Math.abs(distance) < 50) return
    const currentIndex = nav.findIndex((item) => item.id === tab)
    if (distance > 0 && currentIndex < nav.length - 1) setTab(nav[currentIndex + 1].id)
    if (distance < 0 && currentIndex > 0) setTab(nav[currentIndex - 1].id)
  }

  useEffect(() => {
    void bootstrap()
    void initializeNativeAppearance()
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
    if (tab === 'xp-store' && xpProducts.length === 0) void loadXPProducts()
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
        if (barcodeScannerOpen) setBarcodeScannerOpen(false)
        else if (xpFormOpen) closeXPProductForm()
        else if (partnerMode) setPartnerMode(null)
        else if (tab !== 'overview') setTab('overview')
        else void CapacitorApp.minimizeApp()
      }),
    ]).then((listeners) => handles.push(...listeners))
    return () => handles.forEach((handle) => void handle.remove())
  }, [user?.id, tab, partnerMode, xpFormOpen, barcodeScannerOpen])

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
      const update = await checkForAdminUpdate()
      setAvailableUpdate(update)
      if (update)
        await notifyAdminAppUpdate(
          `Crave Admin ${update.versionName} available`,
          update.releaseNotes
        )
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

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (passwordBusy) return

    setPasswordFeedback(null)
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' })
      return
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be between 8 and 256 characters.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password cannot be the same as your current password.',
      })
      return
    }

    setPasswordBusy(true)
    try {
      const response = await apiRequest<{ success?: boolean; message?: string }>(
        '/api/user/change-password',
        {
          method: 'POST',
          body: { currentPassword, newPassword, confirmPassword },
        }
      )
      if (response.success === false) {
        throw new Error(response.message || 'Unable to update your password.')
      }
      setPasswordFeedback({
        type: 'success',
        message: response.message || 'Password updated successfully.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (passwordError) {
      setPasswordFeedback({
        type: 'error',
        message:
          passwordError instanceof Error
            ? passwordError.message
            : 'Unable to update your password.',
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  async function logout() {
    if (!confirmLogout) return
    setConfirmLogout(false)
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    setUser(null)
    setData({ stats: {}, orders: [], restaurants: [] })
    setPayments([])
    setTab('overview')
  }

  function requestLogout() {
    setConfirmLogout(true)
  }

  function openAddPartner() {
    setSelectedPartner(null)
    setPartnerForm(emptyPartnerForm)
    setMapPoint(null)
    setPartnerMode('add')
  }

  function openEditPartner(restaurant: RestaurantRecord) {
    setSelectedPartner(restaurant)
    const lat = restaurant.latitude ? Number(restaurant.latitude) : null
    const lng = restaurant.longitude ? Number(restaurant.longitude) : null
    setPartnerForm({
      ...emptyPartnerForm,
      name: restaurant.name || '',
      cuisine: restaurant.cuisine || '',
      phone: restaurant.phone || '',
      address: restaurant.address || '',
      latitude: lat ? String(lat.toFixed(6)) : '',
      longitude: lng ? String(lng.toFixed(6)) : '',
      commercialModel: restaurant.commercial_model || 'commission',
      commissionRate: String(restaurant.commission_rate ?? 0),
      markupRate: String(restaurant.markup_rate ?? 0),
      fixedCommission: String(restaurant.fixed_commission ?? 0),
      fixedMarkup: String(restaurant.fixed_markup ?? 0),
    })
    setMapPoint(lat && lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null)
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
            latitude: partnerForm.latitude ? Number(partnerForm.latitude) : null,
            longitude: partnerForm.longitude ? Number(partnerForm.longitude) : null,
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
            latitude: partnerForm.latitude ? Number(partnerForm.latitude) : null,
            longitude: partnerForm.longitude ? Number(partnerForm.longitude) : null,
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

  async function loadXPProducts() {
    setXPLoading(true)
    setError('')
    try {
      const response = await apiRequest<{ products?: XPProduct[] }>('/api/admin/cravexp-products')
      setXPProducts(response.products || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load XP Store items.')
    } finally {
      setXPLoading(false)
    }
  }

  function openNewXPProduct() {
    setXPEditingId(null)
    setXPForm(emptyXPProductForm)
    setXPFormOpen(true)
  }

  function openEditXPProduct(product: XPProduct) {
    setXPEditingId(product.id)
    setXPForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      mrp: String(product.mrp),
      image: product.image || '',
      stockCount: String(product.stock_count),
      barcode: product.barcode || '',
      inStock: product.in_stock,
    })
    setXPFormOpen(true)
  }

  function closeXPProductForm() {
    if (xpBusy) return
    setBarcodeScannerOpen(false)
    setXPFormOpen(false)
    setXPEditingId(null)
    setXPForm(emptyXPProductForm)
  }

  function xpProductPayload(form: XPProductForm) {
    return {
      name: form.name.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      price: Number(form.price),
      mrp: Number(form.mrp || form.price),
      image: form.image.trim() || null,
      stock_count: Number(form.stockCount),
      barcode: form.barcode.trim() || null,
      in_stock: form.inStock,
      is_veg: true,
      description: `${form.category.trim()} · ${form.unit.trim()}`,
    }
  }

  async function saveXPProduct(event: FormEvent) {
    event.preventDefault()
    if (xpBusy) return
    const price = Number(xpForm.price)
    const mrp = Number(xpForm.mrp || xpForm.price)
    const stockCount = Number(xpForm.stockCount)
    if (!Number.isInteger(price) || price < 0 || !Number.isInteger(mrp) || mrp < price) {
      setError('Enter whole-number prices. MRP must be equal to or higher than selling price.')
      return
    }
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      setError('Stock count must be a non-negative whole number.')
      return
    }

    setXPBusy(true)
    setError('')
    try {
      await apiRequest('/api/admin/cravexp-products', {
        method: xpEditingId ? 'PATCH' : 'POST',
        body: {
          ...(xpEditingId ? { id: xpEditingId } : {}),
          ...xpProductPayload(xpForm),
        },
      })
      setNotice(xpEditingId ? 'XP Store item updated.' : 'Item added to the XP Store.')
      setXPFormOpen(false)
      setXPEditingId(null)
      setXPForm(emptyXPProductForm)
      await loadXPProducts()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the XP Store item.')
    } finally {
      setXPBusy(false)
    }
  }

  async function toggleXPProduct(product: XPProduct) {
    const previous = xpProducts
    const nextAvailable = !product.in_stock
    setXPProducts((current) =>
      current.map((entry) =>
        entry.id === product.id ? { ...entry, in_stock: nextAvailable } : entry
      )
    )
    try {
      const response = await apiRequest<{ product: XPProduct }>('/api/admin/cravexp-products', {
        method: 'PATCH',
        body: {
          id: product.id,
          ...xpProductPayload({
            name: product.name,
            category: product.category,
            unit: product.unit,
            price: String(product.price),
            mrp: String(product.mrp),
            image: product.image || '',
            stockCount: String(product.stock_count),
            barcode: product.barcode || '',
            inStock: nextAvailable,
          }),
        },
      })
      setXPProducts((current) =>
        current.map((entry) => (entry.id === product.id ? response.product : entry))
      )
      setNotice(nextAvailable ? 'Item is available to customers.' : 'Item hidden from customers.')
    } catch (toggleError) {
      setXPProducts(previous)
      setError(
        toggleError instanceof Error ? toggleError.message : 'Unable to update item availability.'
      )
    }
  }

  async function deleteXPProduct(product: XPProduct) {
    if (!window.confirm(`Remove ${product.name} from the customer XP Store?`)) return
    setXPBusy(true)
    try {
      await apiRequest(`/api/admin/cravexp-products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
      })
      setXPProducts((current) => current.filter((entry) => entry.id !== product.id))
      setNotice(`${product.name} removed from the XP Store.`)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete the XP Store item.'
      )
    } finally {
      setXPBusy(false)
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
    { id: 'xp-store', label: 'XP Store', icon: 'package' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
      </header>

      {!networkConnected && <div className="offline-banner">No internet connection</div>}
      {error && (
        <button
          className="error-banner"
          onClick={() => void (tab === 'xp-store' ? loadXPProducts() : loadDashboard())}
        >
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

        {tab === 'xp-store' && (
          <section className="page xp-page">
            <div className="page-heading xp-page-heading">
              <div>
                <span className="eyebrow">Customer catalog</span>
                <h1>XP Store</h1>
                <p>Add products and control what customers can order from CraveXP.</p>
              </div>
              <button className="add-partner-button" onClick={openNewXPProduct}>
                <b>+</b> Add item
              </button>
            </div>
            <div className="xp-toolbar">
              <label className="xp-search">
                <Icon name="package" />
                <input
                  type="search"
                  value={xpSearch}
                  onChange={(event) => setXPSearch(event.target.value)}
                  placeholder="Search name, category, SKU or barcode"
                />
              </label>
              <button
                className="secondary-button"
                disabled={xpLoading}
                onClick={() => void loadXPProducts()}
              >
                <Icon name="refresh" /> {xpLoading ? 'Syncing…' : 'Refresh'}
              </button>
            </div>
            <div className="xp-grid">
              {xpLoading && xpProducts.length === 0 && (
                <EmptyState text="Loading XP Store items…" />
              )}
              {filteredXPProducts.map((product) => (
                <article className="xp-card" key={product.id}>
                  <div className="xp-card-image">
                    {product.image ? (
                      <img src={product.image} alt="" loading="lazy" />
                    ) : (
                      <Icon name="package" />
                    )}
                    <span className={product.in_stock ? 'available' : ''}>
                      {product.in_stock ? 'Available' : 'Hidden'}
                    </span>
                  </div>
                  <div className="xp-card-body">
                    <small>{product.category}</small>
                    <h3>{product.name}</h3>
                    <p>
                      {product.unit} · Stock {product.stock_count}
                    </p>
                    <div className="xp-prices">
                      <strong>{money(product.price)}</strong>
                      {Number(product.mrp) > Number(product.price) && <s>{money(product.mrp)}</s>}
                    </div>
                    <code>{product.sku_code}</code>
                    <div className="xp-card-actions">
                      <button onClick={() => openEditXPProduct(product)}>Edit</button>
                      <button
                        className="suspend"
                        disabled={xpBusy}
                        onClick={() => void toggleXPProduct(product)}
                      >
                        {product.in_stock ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="delete"
                        disabled={xpBusy}
                        onClick={() => void deleteXPProduct(product)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!xpLoading && filteredXPProducts.length === 0 && (
                <EmptyState
                  text={
                    xpSearch ? 'No XP Store items match your search.' : 'No XP Store items yet.'
                  }
                />
              )}
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
            <article className="settings-card change-password-card">
              <div className="settings-title">
                <span>
                  <Icon name="lock" />
                </span>
                <div>
                  <h3>Change password</h3>
                  <p>Update the password used to sign in to the admin app.</p>
                </div>
              </div>
              <form
                className="change-password-form"
                noValidate
                onSubmit={(event) => void changePassword(event)}
              >
                <div className="change-password-fields">
                  <PasswordField
                    label="Current password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Current password"
                    autoComplete="current-password"
                    visible={showCurrentPassword}
                    onToggleVisibility={() => setShowCurrentPassword((visible) => !visible)}
                    minLength={8}
                    maxLength={256}
                  />
                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="8–256 characters"
                    autoComplete="new-password"
                    visible={showNewPassword}
                    onToggleVisibility={() => setShowNewPassword((visible) => !visible)}
                    minLength={8}
                    maxLength={256}
                  />
                  <PasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    visible={showConfirmPassword}
                    onToggleVisibility={() => setShowConfirmPassword((visible) => !visible)}
                    minLength={8}
                    maxLength={256}
                  />
                </div>
                {passwordFeedback && (
                  <div
                    className={`password-feedback ${passwordFeedback.type}`}
                    role={passwordFeedback.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    {passwordFeedback.message}
                  </div>
                )}
                <div className="change-password-actions">
                  <small>Password length: 8–256 characters.</small>
                  <button className="primary-button" type="submit" disabled={passwordBusy}>
                    {passwordBusy ? 'Updating password…' : 'Update password'}
                  </button>
                </div>
              </form>
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
            <button className="logout-button" onClick={requestLogout}>
              <Icon name="logout" /> Sign out of admin app
            </button>
            {confirmLogout && (
              <div className="modal-backdrop" onClick={() => setConfirmLogout(false)}>
                <article
                  className="partner-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="logout-confirm-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="sheet-handle" />
                  <div className="partner-sheet-heading">
                    <div>
                      <span className="eyebrow">Confirm sign out</span>
                      <h2 id="logout-confirm-title">Really sign out?</h2>
                    </div>
                    <button onClick={() => setConfirmLogout(false)} aria-label="Close">
                      ×
                    </button>
                  </div>
                  <p className="partner-form-help">
                    You will be signed out of the admin app. You can sign back in anytime.
                  </p>
                  <div className="partner-form-actions">
                    <button className="secondary-button" onClick={() => setConfirmLogout(false)}>
                      Cancel
                    </button>
                    <button className="primary-button" onClick={() => void logout()}>
                      <Icon name="logout" /> Sign out
                    </button>
                  </div>
                </article>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Admin app navigation">
        {nav.map((item) => (
          <div
            className={tab === item.id ? 'active' : ''}
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span>
              <Icon name={item.icon} />
              {Boolean(item.badge) && <i>{Math.min(item.badge || 0, 99)}</i>}
            </span>
            <small>{item.label}</small>
          </div>
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
              <div className="partner-map-wrap">
                <div className="partner-map-head">
                  <span>Restaurant location</span>
                  <small>Click the map to drop the pin and capture coordinates.</small>
                </div>
                <Suspense
                  fallback={<div className="address-map-canvas map-loading">Loading map…</div>}
                >
                  <AddressMap
                    location={mapPoint}
                    onPick={(point) => {
                      setMapPoint(point)
                      setPartnerForm((form) => ({
                        ...form,
                        latitude: String(point.lat.toFixed(6)),
                        longitude: String(point.lng.toFixed(6)),
                      }))
                    }}
                  />
                </Suspense>
                <div className="partner-coords">
                  <label>
                    Latitude
                    <input value={partnerForm.latitude} readOnly placeholder="Click the map" />
                  </label>
                  <label>
                    Longitude
                    <input value={partnerForm.longitude} readOnly placeholder="Click the map" />
                  </label>
                </div>
              </div>
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
      {xpFormOpen && (
        <div className="modal-backdrop" onClick={closeXPProductForm}>
          <section
            className="partner-sheet xp-product-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="xp-product-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="partner-sheet-heading">
              <div>
                <span className="eyebrow">XP Store catalog</span>
                <h2 id="xp-product-form-title">{xpEditingId ? 'Edit XP item' : 'Add XP item'}</h2>
              </div>
              <button onClick={closeXPProductForm} aria-label="Close">
                ×
              </button>
            </div>
            <p className="partner-form-help">
              This item is saved directly to the customer-facing CraveXP catalog.
            </p>
            <form className="partner-form xp-product-form" onSubmit={saveXPProduct}>
              <label>
                Product name
                <input
                  value={xpForm.name}
                  onChange={(event) => setXPForm((form) => ({ ...form, name: event.target.value }))}
                  placeholder="Organic eggs"
                  required
                />
              </label>
              <label>
                Category
                <input
                  value={xpForm.category}
                  onChange={(event) =>
                    setXPForm((form) => ({ ...form, category: event.target.value }))
                  }
                  placeholder="Dairy & Eggs"
                  required
                />
              </label>
              <label>
                Unit
                <input
                  value={xpForm.unit}
                  onChange={(event) => setXPForm((form) => ({ ...form, unit: event.target.value }))}
                  placeholder="6 Pieces"
                  required
                />
              </label>
              <label>
                Selling price (₹)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={xpForm.price}
                  onChange={(event) =>
                    setXPForm((form) => ({ ...form, price: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                MRP (₹)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={xpForm.mrp}
                  onChange={(event) => setXPForm((form) => ({ ...form, mrp: event.target.value }))}
                  placeholder="Defaults to selling price"
                />
              </label>
              <label>
                Stock count
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={xpForm.stockCount}
                  onChange={(event) =>
                    setXPForm((form) => ({ ...form, stockCount: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="barcode-field">
                Barcode
                <span className="barcode-input-row">
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={xpForm.barcode}
                    onChange={(event) =>
                      setXPForm((form) => ({ ...form, barcode: event.target.value }))
                    }
                    placeholder="Scan or enter barcode"
                  />
                  <button
                    type="button"
                    className="barcode-scan-button"
                    onClick={() => setBarcodeScannerOpen(true)}
                    aria-label="Scan product barcode with camera"
                  >
                    <Icon name="camera" />
                    <span>Scan</span>
                  </button>
                </span>
              </label>
              <label>
                Image URL
                <input
                  type="url"
                  value={xpForm.image}
                  onChange={(event) =>
                    setXPForm((form) => ({ ...form, image: event.target.value }))
                  }
                  placeholder="https://…"
                />
              </label>
              <label className="xp-availability-field">
                <input
                  type="checkbox"
                  checked={xpForm.inStock}
                  onChange={(event) =>
                    setXPForm((form) => ({ ...form, inStock: event.target.checked }))
                  }
                />
                Available to customers
              </label>
              <div className="partner-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeXPProductForm}
                  disabled={xpBusy}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={xpBusy}>
                  {xpBusy ? 'Saving…' : xpEditingId ? 'Save item' : 'Add to XP Store'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {barcodeScannerOpen && (
        <Suspense
          fallback={
            <div className="barcode-scanner-backdrop">
              <div className="barcode-scanner-loading">Loading scanner…</div>
            </div>
          }
        >
          <BarcodeScanner
            onClose={() => setBarcodeScannerOpen(false)}
            onDetected={(barcode) => {
              setXPForm((form) => ({ ...form, barcode }))
              setBarcodeScannerOpen(false)
              setNotice('Barcode scanned and added to the product.')
            }}
          />
        </Suspense>
      )}
      {notice && <div className="toast">{notice}</div>}
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
