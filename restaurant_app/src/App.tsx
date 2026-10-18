import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Network } from '@capacitor/network'
import { SplashScreen } from '@capacitor/splash-screen'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  COOKIE_SESSION_TOKEN,
  apiRequest,
  clearAuthToken,
  getAuthToken,
  restoreAuthToken,
  saveAuthToken,
} from './api'
import { Icon, type IconName } from './Icon'
import {
  getNotificationPreference,
  initializeNativeAppearance,
  requestNotificationPermission,
  setNotificationPreference,
  showKitchenNotification,
} from './native'
import { connectRestaurantEvents } from './realtime'
import { checkForRestaurantUpdate, installRestaurantUpdate, type RestaurantUpdate } from './update'
import type {
  AppTab,
  MenuEditorValue,
  MenuItem,
  MenuVariant,
  Restaurant,
  RestaurantOrder,
  RestaurantUser,
  Settlement,
  SettlementSummary,
} from './types'

const APP_NAME = 'crave kitchen'
const RESTAURANT_ROLES = new Set(['restaurant_vendor', 'cravexp_store_vendor', 'vendor'])
const ACTIVE_STATUSES = new Set([
  'payment_verified',
  'sent_to_vendor',
  'new',
  'accepted',
  'preparing',
  'cooking',
  'packing',
  'ready',
  'ready_for_pickup',
  'rider_assigned',
])

const COMPLETED_STATUSES = new Set(['picked_up', 'out_for_delivery', 'delivered', 'completed'])

const CATEGORY_OPTIONS = [
  'Biryani, Rice & Pulao',
  'North Indian Curries',
  'South Indian & Dosa',
  'Starters & Appetizers',
  'Burgers & Sandwiches',
  'Pizzas & Pasta',
  'Rolls & Wraps',
  'Beverages',
  'Desserts & Sweets',
  'General',
]

const EMPTY_EDITOR: MenuEditorValue = {
  name: '',
  category: CATEGORY_OPTIONS[0],
  description: '',
  restaurantPrice: '',
  appPrice: '',
  image: '',
  isVeg: true,
  inStock: true,
  stockCount: '50',
  unit: 'Serves 1',
  useSizes: false,
  variants: [],
}

function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function shortOrderId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`
}

function orderTime(order: RestaurantOrder): string {
  const value = order.created_at || order.createdAt
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
    payment_verified: 'Payment verified',
    sent_to_vendor: 'New order',
    new: 'New order',
    accepted: 'Accepted',
    preparing: 'Preparing',
    cooking: 'Preparing',
    packing: 'Packing',
    ready: 'Ready',
    ready_for_pickup: 'Ready for pickup',
    rider_assigned: 'Rider assigned',
    picked_up: 'Picked up',
    out_for_delivery: 'Out for delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status.replaceAll('_', ' ')
}

function parseOrderItems(order: RestaurantOrder) {
  if (Array.isArray(order.items)) return order.items
  try {
    const parsed = JSON.parse(order.items || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatMenuItem(item: any, restaurantId: string): MenuItem {
  return {
    id: item.id,
    restaurant_id: item.restaurant_id || restaurantId,
    name: item.name,
    category: item.category || 'General',
    price: Number(item.price || 0),
    restaurant_price: Number(item.restaurant_price ?? item.price ?? 0),
    description: item.description || '',
    image: item.image || '',
    in_stock: item.in_stock !== false,
    is_veg: item.is_veg !== false,
    stock_count: Number(item.stock_count || 0),
    unit: item.unit || null,
    variants: Array.isArray(item.variants)
      ? item.variants.map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          restaurant_price: Number(variant.restaurant_price || 0),
          price: Number(variant.price || 0),
          in_stock: variant.in_stock !== false,
          is_default: variant.is_default === true,
        }))
      : [],
  }
}

function nextOrderAction(status: string): { label: string; status: string } | null {
  if (['payment_verified', 'sent_to_vendor', 'new', 'accepted'].includes(status)) {
    return { label: 'Start preparing', status: 'preparing' }
  }
  if (['preparing', 'cooking'].includes(status)) {
    return { label: 'Move to packing', status: 'packing' }
  }
  if (status === 'packing') return { label: 'Ready for pickup', status: 'ready_for_pickup' }
  return null
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
          <span className="brand-mark">c</span>
          <div>
            <strong>crave.</strong>
            <small>restaurant partner</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Kitchen command centre</span>
          <h1>Run every order from one app.</h1>
          <p>Live orders, menu control, sales and store settings—built for restaurant teams.</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            Partner email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@restaurant.com"
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
            {submitting ? <span className="button-spinner" /> : 'Open restaurant app'}
          </button>
        </form>
        <p className="login-security">Secure access for approved Crave restaurant partners.</p>
      </section>
    </main>
  )
}

function UpdatePrompt({
  update,
  installing,
  error,
  onInstall,
  onDismiss,
}: {
  update: RestaurantUpdate | null
  installing: boolean
  error: string
  onInstall: () => void
  onDismiss: () => void
}) {
  if (!update) return null
  return (
    <div className="modal-backdrop update-backdrop" role="dialog" aria-modal="true">
      <section className="update-sheet">
        <span className="update-icon" aria-hidden="true">
          <Icon name="download" />
        </span>
        <span className="eyebrow">New version available</span>
        <h2>Update Crave Restaurant</h2>
        <p>
          Version {update.versionName} is ready. The app will verify the download before opening
          Android’s installer.
        </p>
        <div className="update-notes">{update.releaseNotes}</div>
        {error && <div className="update-error">{error}</div>}
        <div className="update-actions">
          <button className="secondary-button" disabled={installing} onClick={onDismiss}>
            Later
          </button>
          <button className="primary-button" disabled={installing} onClick={onInstall}>
            {installing ? <span className="button-spinner dark" /> : 'Update now'}
          </button>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function OrderCard({
  order,
  busy,
  onAdvance,
}: {
  order: RestaurantOrder
  busy: boolean
  onAdvance: (order: RestaurantOrder, status: string) => void
}) {
  const items = parseOrderItems(order)
  const action = nextOrderAction(order.status)
  return (
    <article className="order-card">
      <div className="order-card-head">
        <div>
          <span className="order-id">{shortOrderId(order.id)}</span>
          <h3>{order.customer_name || 'Crave customer'}</h3>
          <p>{orderTime(order)}</p>
        </div>
        <span className={`status-pill status-${order.status}`}>{statusLabel(order.status)}</span>
      </div>
      <div className="order-items">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`}>
            <span>
              <b>{item.qty || 1}×</b> {item.name}
              {item.variantName ? ` · ${item.variantName}` : ''}
            </span>
            <strong>{money(Number(item.price || 0) * Number(item.qty || 1))}</strong>
          </div>
        ))}
      </div>
      <div className="order-meta">
        <span>
          <Icon name="store" /> {order.customer_address || 'Delivery address available'}
        </span>
        {order.driver_name && <span>Rider: {order.driver_name}</span>}
      </div>
      <div className="order-card-foot">
        <div>
          <span>Order value</span>
          <strong>{money(order.subtotal || order.total_amount)}</strong>
        </div>
        {action && (
          <button
            className="primary-button compact-button"
            disabled={busy}
            onClick={() => onAdvance(order, action.status)}
          >
            {busy ? <span className="button-spinner dark" /> : action.label}
            {!busy && <Icon name="chevron" />}
          </button>
        )}
      </div>
    </article>
  )
}

function MenuEditor({
  value,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  value: MenuEditorValue
  saving: boolean
  onChange: (value: MenuEditorValue) => void
  onClose: () => void
  onSave: () => void
}) {
  function toggleSizes() {
    if (value.useSizes) {
      onChange({ ...value, useSizes: false, variants: [] })
      return
    }
    const restaurantPrice = Number(value.restaurantPrice || 0)
    const price = Number(value.appPrice || restaurantPrice)
    onChange({
      ...value,
      useSizes: true,
      variants: ['Small', 'Medium', 'Large'].map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        restaurant_price: restaurantPrice,
        price,
        in_stock: true,
        is_default: index === 0,
      })),
    })
  }

  function updateVariant(id: string, changes: Partial<MenuVariant>) {
    onChange({
      ...value,
      variants: value.variants.map((variant) =>
        variant.id === id ? { ...variant, ...changes } : variant
      ),
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="sheet menu-editor-sheet">
        <header className="sheet-header">
          <div>
            <span className="eyebrow">Menu management</span>
            <h2>{value.id ? 'Edit dish' : 'Add a new dish'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body form-grid">
          <label className="field-wide">
            Dish name
            <input
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              placeholder="e.g. Paneer Tikka Bowl"
            />
          </label>
          <label>
            Category
            <select
              value={value.category}
              onChange={(event) => onChange({ ...value, category: event.target.value })}
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Portion / unit
            <input
              value={value.unit}
              onChange={(event) => onChange({ ...value, unit: event.target.value })}
              placeholder="Serves 1"
            />
          </label>
          <label>
            Restaurant price
            <input
              inputMode="numeric"
              value={value.restaurantPrice}
              onChange={(event) => onChange({ ...value, restaurantPrice: event.target.value })}
              placeholder="₹0"
            />
          </label>
          <label>
            App selling price
            <input
              inputMode="numeric"
              value={value.appPrice}
              onChange={(event) => onChange({ ...value, appPrice: event.target.value })}
              placeholder="₹0"
            />
          </label>
          <label>
            Stock count
            <input
              inputMode="numeric"
              value={value.stockCount}
              onChange={(event) => onChange({ ...value, stockCount: event.target.value })}
            />
          </label>
          <label>
            Image URL
            <input
              value={value.image}
              onChange={(event) => onChange({ ...value, image: event.target.value })}
              placeholder="https://..."
            />
          </label>
          <label className="field-wide">
            Description
            <textarea
              value={value.description}
              onChange={(event) => onChange({ ...value, description: event.target.value })}
              placeholder="Ingredients and short description"
              rows={3}
            />
          </label>
          <div className="choice-row field-wide">
            <button
              className={value.isVeg ? 'choice active' : 'choice'}
              onClick={() => onChange({ ...value, isVeg: !value.isVeg })}
            >
              <span className="veg-dot" /> {value.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            </button>
            <button
              className={value.inStock ? 'choice active' : 'choice'}
              onClick={() => onChange({ ...value, inStock: !value.inStock })}
            >
              <Icon name="check" /> {value.inStock ? 'Available' : 'Unavailable'}
            </button>
            <button className={value.useSizes ? 'choice active' : 'choice'} onClick={toggleSizes}>
              <Icon name="menu" /> Small / Medium / Large
            </button>
          </div>
          {value.useSizes && (
            <div className="variant-editor field-wide">
              <div className="variant-head">
                <span>Size</span>
                <span>Restaurant</span>
                <span>App price</span>
              </div>
              {value.variants.map((variant) => (
                <div className="variant-row" key={variant.id}>
                  <strong>{variant.name}</strong>
                  <input
                    inputMode="numeric"
                    value={variant.restaurant_price}
                    onChange={(event) =>
                      updateVariant(variant.id, {
                        restaurant_price: Number(event.target.value || 0),
                      })
                    }
                  />
                  <input
                    inputMode="numeric"
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(variant.id, { price: Number(event.target.value || 0) })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="sheet-footer">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving} onClick={onSave}>
            {saving ? (
              <span className="button-spinner dark" />
            ) : value.id ? (
              'Save changes'
            ) : (
              'Add dish'
            )}
          </button>
        </footer>
      </section>
    </div>
  )
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<RestaurantUser | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<RestaurantOrder[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [liveConnected, setLiveConnected] = useState(false)
  const [online, setOnline] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [orderFilter, setOrderFilter] = useState('active')
  const [menuSearch, setMenuSearch] = useState('')
  const [busyOrders, setBusyOrders] = useState<Record<string, boolean>>({})
  const [menuEditor, setMenuEditor] = useState<MenuEditorValue | null>(null)
  const [savingMenu, setSavingMenu] = useState(false)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null)
  const [toast, setToast] = useState('')
  const [availableUpdate, setAvailableUpdate] = useState<RestaurantUpdate | null>(null)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    cuisine: '',
    phone: '',
    address: '',
    payoutVpa: '',
    fssai: '',
  })
  const ordersRef = useRef<RestaurantOrder[]>([])
  const updateCheckRunningRef = useRef(false)
  const dismissedUpdateRef = useRef<number | null>(null)

  useEffect(() => {
    ordersRef.current = orders
  }, [orders])

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
    let active = true
    const check = async () => {
      if (updateCheckRunningRef.current) return
      updateCheckRunningRef.current = true
      try {
        const update = await checkForRestaurantUpdate()
        if (active && update && update.versionCode !== dismissedUpdateRef.current) {
          setAvailableUpdate(update)
          setUpdateError('')
        }
      } catch (error) {
        console.warn('[update] Version check failed:', error)
      } finally {
        updateCheckRunningRef.current = false
      }
    }

    void check()
    const timer = window.setInterval(() => void check(), 60_000)
    let appStateHandle: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void check()
    }).then((handle) => {
      appStateHandle = handle
    })
    return () => {
      active = false
      window.clearInterval(timer)
      if (appStateHandle) void appStateHandle.remove()
    }
  }, [])

  useEffect(() => {
    if (!restaurant) return
    setSettingsForm({
      name: restaurant.name || '',
      cuisine: restaurant.cuisine || '',
      phone: restaurant.phone || user?.phone || '',
      address: restaurant.address || user?.address || '',
      payoutVpa: restaurant.payout_vpa || '',
      fssai: restaurant.fssai_license || '',
    })
  }, [restaurant?.id])

  useEffect(() => {
    if (!user || !restaurant || !getAuthToken() || getAuthToken() === COOKIE_SESSION_TOKEN) {
      return
    }
    return connectRestaurantEvents({
      token: getAuthToken(),
      onStatus: setLiveConnected,
      onEvent: (channel, data) => {
        if (channel === 'vendor_orders' && data?.order) {
          const incoming = data.order as RestaurantOrder
          const known = ordersRef.current.some((order) => order.id === incoming.id)
          setOrders((current) => {
            const exists = current.some((order) => order.id === incoming.id)
            return exists
              ? current.map((order) =>
                  order.id === incoming.id ? { ...order, ...incoming } : order
                )
              : [incoming, ...current]
          })
          if (!known && ACTIVE_STATUSES.has(incoming.status)) {
            const title = `New paid order ${shortOrderId(incoming.id)}`
            const body = `${incoming.customer_name || 'Customer'} · ${money(incoming.subtotal || incoming.total_amount)}`
            setAlert({ title, body })
            void showKitchenNotification({ id: incoming.id, title, body })
          }
        } else if (channel === 'menu_items') {
          void loadMenu(restaurant.id)
        } else if (channel === 'restaurants') {
          void reloadRestaurant(user)
        } else if (channel === 'admin_settlements') {
          void loadSales(restaurant.id)
        }
      },
    })
  }, [user?.id, restaurant?.id])

  useEffect(() => {
    if (!restaurant) return
    const timer = window.setInterval(() => void loadOrders(restaurant.id, false), 15000)
    return () => window.clearInterval(timer)
  }, [restaurant?.id])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handles: Array<{ remove: () => Promise<void> }> = []
    void Promise.all([
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && restaurant) {
          void initializeNativeAppearance()
          void refreshAll(false)
        }
      }),
      CapacitorApp.addListener('backButton', () => {
        if (menuEditor) setMenuEditor(null)
        else if (activeTab !== 'home') setActiveTab('home')
        else void CapacitorApp.minimizeApp()
      }),
      Network.addListener('networkStatusChange', ({ connected }) => setOnline(connected)),
      LocalNotifications.addListener('localNotificationActionPerformed', () => {
        setActiveTab('orders')
      }),
    ]).then((listeners) => handles.push(...listeners))
    void Network.getStatus().then(({ connected }) => setOnline(connected))
    return () => handles.forEach((handle) => void handle.remove())
  }, [activeTab, menuEditor, restaurant?.id])

  async function bootstrap() {
    await initializeNativeAppearance()
    try {
      const token = await restoreAuthToken()
      setNotificationEnabled(await getNotificationPreference())
      if (!token) return
      const result = await apiRequest<{ authenticated: boolean; user: RestaurantUser }>(
        '/api/auth/me',
        { token }
      )
      if (result.authenticated && result.user) await startSession(result.user)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await clearAuthToken()
    } finally {
      setBooting(false)
      await SplashScreen.hide().catch(() => undefined)
    }
  }

  async function handleLogin(email: string, password: string) {
    const result = await apiRequest<{
      success: boolean
      token?: string
      user: RestaurantUser
    }>('/api/auth/login', { method: 'POST', body: { email, password }, token: '' })
    if (!RESTAURANT_ROLES.has(result.user.role)) {
      throw new Error('This app is only for restaurant partner accounts.')
    }
    let sessionUser = result.user
    if (result.token) {
      await saveAuthToken(result.token)
    } else {
      const cookieSession = await apiRequest<{
        authenticated: boolean
        user?: RestaurantUser
      }>('/api/auth/me', { token: '' })
      if (!cookieSession.authenticated || !cookieSession.user) {
        throw new Error(
          'Your sign-in was accepted, but the server did not keep the app session. Update the backend and try again.'
        )
      }
      sessionUser = cookieSession.user
      await saveAuthToken(COOKIE_SESSION_TOKEN)
    }
    try {
      await startSession(sessionUser)
    } catch (error) {
      await clearAuthToken()
      throw error
    }
  }

  async function startSession(nextUser: RestaurantUser) {
    if (!RESTAURANT_ROLES.has(nextUser.role)) {
      await clearAuthToken()
      throw new Error('This app is only for restaurant partner accounts.')
    }
    const nextRestaurant = await resolveRestaurant(nextUser)
    setUser(nextUser)
    setRestaurant(nextRestaurant)
    await loadAllData(nextRestaurant.id)
  }

  async function installUpdate() {
    if (!availableUpdate || installingUpdate) return
    setInstallingUpdate(true)
    setUpdateError('')
    try {
      await installRestaurantUpdate(availableUpdate)
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'The update could not be installed.')
    } finally {
      setInstallingUpdate(false)
    }
  }

  function dismissUpdate() {
    if (availableUpdate) dismissedUpdateRef.current = availableUpdate.versionCode
    setAvailableUpdate(null)
    setUpdateError('')
  }

  async function resolveRestaurant(nextUser: RestaurantUser): Promise<Restaurant> {
    const result = await apiRequest<{ restaurants: Restaurant[] }>(
      `/api/restaurants?ownerId=${encodeURIComponent(nextUser.id)}`
    )
    if (result.restaurants?.[0]) return result.restaurants[0]
    throw new Error(
      'This partner account is not linked to a restaurant yet. Ask the administrator to complete the restaurant setup.'
    )
  }

  async function reloadRestaurant(nextUser = user) {
    if (!nextUser) return
    const result = await apiRequest<{ restaurants: Restaurant[] }>(
      `/api/restaurants?ownerId=${encodeURIComponent(nextUser.id)}`
    )
    if (result.restaurants?.[0]) setRestaurant(result.restaurants[0])
  }

  async function loadAllData(restaurantId: string) {
    await Promise.all([
      loadOrders(restaurantId, false),
      loadMenu(restaurantId),
      loadSales(restaurantId),
    ])
  }

  async function loadOrders(restaurantId: string, showLoader = true) {
    if (showLoader) setRefreshing(true)
    try {
      const result = await apiRequest<{ orders: RestaurantOrder[] }>(
        `/api/orders?vendorId=${encodeURIComponent(restaurantId)}`
      )
      const sorted = [...(result.orders || [])].sort(
        (a, b) =>
          new Date(b.created_at || b.createdAt || 0).getTime() -
          new Date(a.created_at || a.createdAt || 0).getTime()
      )
      setOrders(sorted)
    } finally {
      if (showLoader) setRefreshing(false)
    }
  }

  async function loadMenu(restaurantId: string) {
    const result = await apiRequest<{ items: any[] }>(
      `/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`
    )
    setMenuItems((result.items || []).map((item) => formatMenuItem(item, restaurantId)))
  }

  async function loadSales(restaurantId: string) {
    const result = await apiRequest<{
      settlements: Settlement[]
      summary: SettlementSummary
    }>(`/api/admin/settlements?vendorId=${encodeURIComponent(restaurantId)}`)
    setSettlements(result.settlements || [])
    setSettlementSummary(result.summary || null)
  }

  async function refreshAll(showLoader = true) {
    if (!restaurant) return
    if (showLoader) setRefreshing(true)
    try {
      await Promise.all([
        loadOrders(restaurant.id, false),
        loadMenu(restaurant.id),
        loadSales(restaurant.id),
        reloadRestaurant(),
      ])
      showToast('App data is up to date.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to refresh data.')
    } finally {
      if (showLoader) setRefreshing(false)
    }
  }

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  async function updateOrderStatus(order: RestaurantOrder, status: string) {
    setBusyOrders((current) => ({ ...current, [order.id]: true }))
    try {
      const result = await apiRequest<{ order: RestaurantOrder }>('/api/orders', {
        method: 'PATCH',
        body: { orderId: order.id, status },
      })
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, ...(result.order || {}), status } : item
        )
      )
      showToast(`${shortOrderId(order.id)} moved to ${statusLabel(status)}.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update order.')
    } finally {
      setBusyOrders((current) => ({ ...current, [order.id]: false }))
    }
  }

  async function toggleRestaurant() {
    if (!restaurant) return
    try {
      const result = await apiRequest<{ restaurant: Restaurant }>('/api/restaurants', {
        method: 'PATCH',
        body: { id: restaurant.id, is_open: !restaurant.is_open },
      })
      setRestaurant(result.restaurant)
      showToast(
        result.restaurant.is_open ? 'Restaurant is accepting orders.' : 'Restaurant is offline.'
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update restaurant status.')
    }
  }

  function editMenuItem(item?: MenuItem) {
    if (!item) {
      setMenuEditor({ ...EMPTY_EDITOR })
      return
    }
    setMenuEditor({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      restaurantPrice: String(item.restaurant_price),
      appPrice: String(item.price),
      image: item.image,
      isVeg: item.is_veg,
      inStock: item.in_stock,
      stockCount: String(item.stock_count),
      unit: item.unit || 'Serves 1',
      useSizes: item.variants.length > 0,
      variants: item.variants,
    })
  }

  async function saveMenuItem() {
    if (!restaurant || !menuEditor) return
    const restaurantPrice = Math.round(Number(menuEditor.restaurantPrice))
    const appPrice = Math.round(Number(menuEditor.appPrice))
    if (
      !menuEditor.name.trim() ||
      !Number.isFinite(restaurantPrice) ||
      !Number.isFinite(appPrice)
    ) {
      showToast('Dish name and both prices are required.')
      return
    }
    if (restaurantPrice < 0 || appPrice < restaurantPrice) {
      showToast('App price must be at least the restaurant price.')
      return
    }
    if (
      menuEditor.useSizes &&
      menuEditor.variants.some(
        (variant) => variant.restaurant_price < 0 || variant.price < variant.restaurant_price
      )
    ) {
      showToast('Each app size price must be at least its restaurant price.')
      return
    }

    setSavingMenu(true)
    try {
      const payload = {
        ...(menuEditor.id ? { id: menuEditor.id } : {}),
        restaurant_id: restaurant.id,
        name: menuEditor.name.trim(),
        category: menuEditor.category,
        description: menuEditor.description.trim() || null,
        restaurant_price: restaurantPrice,
        price: appPrice,
        image: menuEditor.image.trim() || null,
        is_veg: menuEditor.isVeg,
        in_stock: menuEditor.inStock,
        stock_count: Math.max(0, Math.round(Number(menuEditor.stockCount || 0))),
        unit: menuEditor.unit.trim() || null,
        hsn_sac_code: '996331',
        price_tax_mode: 'TAX_INCLUSIVE',
        variants: menuEditor.useSizes
          ? menuEditor.variants.map((variant, index) => ({
              ...variant,
              restaurant_price: Math.round(variant.restaurant_price),
              price: Math.round(variant.price),
              is_default: index === 0,
            }))
          : [],
      }
      await apiRequest('/api/menu-items', {
        method: menuEditor.id ? 'PATCH' : 'POST',
        body: payload,
      })
      await loadMenu(restaurant.id)
      setMenuEditor(null)
      showToast(menuEditor.id ? 'Dish updated.' : 'Dish added to the live menu.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save dish.')
    } finally {
      setSavingMenu(false)
    }
  }

  async function toggleMenuStock(item: MenuItem) {
    try {
      await apiRequest('/api/menu-items', {
        method: 'PATCH',
        body: { id: item.id, in_stock: !item.in_stock },
      })
      setMenuItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, in_stock: !entry.in_stock } : entry
        )
      )
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update dish.')
    }
  }

  async function deleteMenuItem(item: MenuItem) {
    if (!window.confirm(`Delete ${item.name} from the restaurant menu?`)) return
    try {
      await apiRequest(`/api/menu-items?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      setMenuItems((current) => current.filter((entry) => entry.id !== item.id))
      showToast('Dish deleted.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete dish.')
    }
  }

  async function saveRestaurantSettings(event: FormEvent) {
    event.preventDefault()
    if (!restaurant) return
    try {
      const result = await apiRequest<{ restaurant: Restaurant }>('/api/restaurants', {
        method: 'PATCH',
        body: {
          id: restaurant.id,
          name: settingsForm.name.trim(),
          cuisine: settingsForm.cuisine.trim(),
          phone: settingsForm.phone.trim() || null,
          address: settingsForm.address.trim() || null,
          payout_vpa: settingsForm.payoutVpa.trim() || null,
          fssai_license: settingsForm.fssai.trim() || null,
        },
      })
      setRestaurant(result.restaurant)
      showToast('Restaurant settings saved.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save settings.')
    }
  }

  async function toggleNotifications() {
    if (notificationEnabled) {
      await setNotificationPreference(false)
      setNotificationEnabled(false)
      showToast('Live notification alerts muted on this device.')
      return
    }
    const allowed = await requestNotificationPermission()
    await setNotificationPreference(allowed)
    setNotificationEnabled(allowed)
    showToast(
      allowed ? 'Live order notifications enabled.' : 'Notification permission was not granted.'
    )
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    setUser(null)
    setRestaurant(null)
    setOrders([])
    setMenuItems([])
    setSettlements([])
    setActiveTab('home')
  }

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status))
  const readyOrders = orders.filter((order) => ['ready', 'ready_for_pickup'].includes(order.status))
  const todayKey = new Date().toDateString()
  const todayOrders = orders.filter(
    (order) => new Date(order.created_at || order.createdAt || 0).toDateString() === todayKey
  )
  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.subtotal || order.total_amount || 0),
    0
  )
  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'all') return true
    if (orderFilter === 'active') return ACTIVE_STATUSES.has(order.status)
    if (orderFilter === 'ready') return ['ready', 'ready_for_pickup'].includes(order.status)
    return COMPLETED_STATUSES.has(order.status) || order.status === 'cancelled'
  })
  const filteredMenu = menuItems.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(menuSearch.toLowerCase())
  )

  const salesMetrics = useMemo(() => {
    const gross = orders.reduce(
      (sum, order) => sum + Number(order.subtotal || order.total_amount || 0),
      0
    )
    const commissionRate = Number(restaurant?.commission_rate || 0)
    const commission =
      settlementSummary?.total_commission ?? Math.round((gross * commissionRate) / 100)
    const net = settlementSummary?.total_net_payable ?? Math.max(0, gross - commission)
    return {
      gross: settlementSummary?.total_gross_sales || gross,
      commission,
      net,
      paid: settlementSummary?.total_settled_amount || 0,
      pending: settlementSummary?.remaining_balance ?? Math.max(0, net),
    }
  }, [orders, restaurant?.commission_rate, settlementSummary])

  if (booting) {
    return (
      <>
        <main className="splash-screen">
          <span className="brand-mark splash-mark">c</span>
          <strong>crave.</strong>
          <span className="loader-line">
            <i />
          </span>
        </main>
        <UpdatePrompt
          update={availableUpdate}
          installing={installingUpdate}
          error={updateError}
          onInstall={() => void installUpdate()}
          onDismiss={dismissUpdate}
        />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <UpdatePrompt
          update={availableUpdate}
          installing={installingUpdate}
          error={updateError}
          onInstall={() => void installUpdate()}
          onDismiss={dismissUpdate}
        />
      </>
    )
  }

  const navItems: Array<{ id: AppTab; label: string; icon: IconName; badge?: number }> = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'orders', label: 'Orders', icon: 'orders', badge: activeOrders.length },
    { id: 'menu', label: 'Menu', icon: 'menu' },
    { id: 'sales', label: 'Sales', icon: 'sales' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">c</span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{restaurant?.name || 'Restaurant partner'}</small>
          </div>
        </div>
        <div className="header-actions">
          <span className={`connection-chip ${liveConnected && online ? 'connected' : ''}`}>
            <Icon name={online ? 'wifi' : 'offline'} />
            {online ? (liveConnected ? 'Live' : 'Syncing') : 'Offline'}
          </span>
          <button
            className={`icon-button notification-button ${notificationEnabled ? 'enabled' : ''}`}
            onClick={() => void toggleNotifications()}
            aria-label="Toggle notifications"
          >
            <Icon name="bell" />
          </button>
        </div>
      </header>

      {!online && (
        <div className="offline-banner">
          No internet connection. Changes will resume when online.
        </div>
      )}
      {alert && (
        <button
          className="live-alert"
          onClick={() => {
            setActiveTab('orders')
            setAlert(null)
          }}
        >
          <span className="live-alert-icon">
            <Icon name="bell" />
          </span>
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.body}</small>
          </span>
          <Icon name="chevron" />
        </button>
      )}

      <main className="app-content">
        {activeTab === 'home' && (
          <section className="page home-page">
            <div className="hero-card">
              <div>
                <span className="eyebrow">Live kitchen</span>
                <h1>
                  {restaurant?.is_open ? 'Ready for the rush.' : 'Your restaurant is offline.'}
                </h1>
                <p>
                  {restaurant?.is_open
                    ? `${activeOrders.length} active order${activeOrders.length === 1 ? '' : 's'} need your team’s attention.`
                    : 'Turn the kitchen online when you are ready to accept new orders.'}
                </p>
              </div>
              <button
                className={`store-switch ${restaurant?.is_open ? 'online' : ''}`}
                onClick={() => void toggleRestaurant()}
              >
                <span>
                  <i />
                </span>
                {restaurant?.is_open ? 'Accepting orders' : 'Go online'}
              </button>
            </div>

            <div className="stats-grid">
              <StatCard label="Active orders" value={String(activeOrders.length)} tone="amber" />
              <StatCard label="Ready pickup" value={String(readyOrders.length)} tone="green" />
              <StatCard label="Today’s orders" value={String(todayOrders.length)} tone="blue" />
              <StatCard label="Today’s sales" value={money(todaySales)} tone="violet" />
            </div>

            <div className="section-heading">
              <div>
                <span className="eyebrow">Kitchen queue</span>
                <h2>Orders needing action</h2>
              </div>
              <button className="text-button" onClick={() => setActiveTab('orders')}>
                View all <Icon name="chevron" />
              </button>
            </div>
            {activeOrders.length > 0 ? (
              <div className="order-grid home-order-grid">
                {activeOrders.slice(0, 4).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={Boolean(busyOrders[order.id])}
                    onAdvance={updateOrderStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="orders" />
                <h3>Kitchen queue is clear</h3>
                <p>New verified orders will appear here instantly.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="page">
            <div className="page-title-row">
              <div>
                <span className="eyebrow">Real-time operations</span>
                <h1>Orders</h1>
                <p>Prepare and hand off every paid order.</p>
              </div>
              <button
                className="icon-button refresh-button"
                onClick={() => void refreshAll()}
                disabled={refreshing}
              >
                <Icon name="refresh" />
              </button>
            </div>
            <div className="filter-tabs">
              {[
                ['active', 'Active'],
                ['ready', 'Ready'],
                ['completed', 'History'],
                ['all', 'All'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={orderFilter === id ? 'active' : ''}
                  onClick={() => setOrderFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredOrders.length > 0 ? (
              <div className="order-grid">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={Boolean(busyOrders[order.id])}
                    onAdvance={updateOrderStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="clock" />
                <h3>No orders in this view</h3>
                <p>Live events will update this page automatically.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'menu' && (
          <section className="page">
            <div className="page-title-row">
              <div>
                <span className="eyebrow">Restaurant catalog</span>
                <h1>Menu</h1>
                <p>{menuItems.length} dishes connected to the live customer menu.</p>
              </div>
              <button className="primary-button add-button" onClick={() => editMenuItem()}>
                <Icon name="plus" /> Add dish
              </button>
            </div>
            <label className="search-field">
              <Icon name="search" />
              <input
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder="Search dishes or categories"
              />
              {menuSearch && (
                <button onClick={() => setMenuSearch('')}>
                  <Icon name="close" />
                </button>
              )}
            </label>
            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <article className="menu-card" key={item.id}>
                  <div className="menu-image">
                    {item.image ? (
                      <img src={item.image} alt="" />
                    ) : (
                      <span>
                        <Icon name="menu" />
                      </span>
                    )}
                    <i className={item.is_veg ? 'veg' : 'non-veg'} />
                  </div>
                  <div className="menu-card-content">
                    <div>
                      <span className="menu-category">{item.category}</span>
                      <h3>{item.name}</h3>
                      <p>{item.description || item.unit || 'Restaurant menu item'}</p>
                    </div>
                    {item.variants.length > 0 && (
                      <div className="size-chips">
                        {item.variants.map((variant) => (
                          <span key={variant.id}>
                            {variant.name} {money(variant.price)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="menu-price-row">
                      <div>
                        <small>Restaurant / App</small>
                        <strong>
                          {money(item.restaurant_price)} <i>→</i> {money(item.price)}
                        </strong>
                      </div>
                      <button
                        className={`mini-switch ${item.in_stock ? 'on' : ''}`}
                        onClick={() => void toggleMenuStock(item)}
                      >
                        <span />
                      </button>
                    </div>
                    <div className="menu-actions">
                      <button onClick={() => editMenuItem(item)}>
                        <Icon name="edit" /> Edit
                      </button>
                      <button className="danger" onClick={() => void deleteMenuItem(item)}>
                        <Icon name="trash" /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'sales' && (
          <section className="page">
            <div className="page-title-row">
              <div>
                <span className="eyebrow">Payout intelligence</span>
                <h1>Sales &amp; settlements</h1>
                <p>Your restaurant earnings from the live backend.</p>
              </div>
            </div>
            <div className="sales-hero">
              <span>Net earnings</span>
              <strong>{money(salesMetrics.net)}</strong>
              <small>After {Number(restaurant?.commission_rate || 0)}% platform commission</small>
            </div>
            <div className="stats-grid sales-stats">
              <StatCard label="Gross sales" value={money(salesMetrics.gross)} tone="blue" />
              <StatCard label="Commission" value={money(salesMetrics.commission)} tone="amber" />
              <StatCard label="Settled" value={money(salesMetrics.paid)} tone="green" />
              <StatCard label="Pending payout" value={money(salesMetrics.pending)} tone="violet" />
            </div>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Payout ledger</span>
                <h2>Settlement history</h2>
              </div>
            </div>
            <div className="settlement-list">
              {settlements.length > 0 ? (
                settlements.map((settlement) => (
                  <article key={settlement.id}>
                    <span className={`settlement-status ${settlement.status}`}>
                      {settlement.status}
                    </span>
                    <div>
                      <strong>{money(settlement.net_payout)}</strong>
                      <small>
                        {settlement.payout_date
                          ? new Date(settlement.payout_date).toLocaleDateString()
                          : 'Scheduled'}{' '}
                        · {settlement.transaction_ref || 'Reference pending'}
                      </small>
                    </div>
                    <div className="settlement-gross">
                      <span>Gross</span>
                      <strong>{money(settlement.gross_sales)}</strong>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state compact">
                  <Icon name="sales" />
                  <h3>No settlements yet</h3>
                  <p>Completed payout records will appear here.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page settings-page">
            <div className="page-title-row">
              <div>
                <span className="eyebrow">Restaurant control</span>
                <h1>Settings</h1>
                <p>Store profile, alerts and account access.</p>
              </div>
            </div>
            <div className="settings-layout">
              <form className="settings-card" onSubmit={saveRestaurantSettings}>
                <div className="card-title">
                  <span>
                    <Icon name="store" />
                  </span>
                  <div>
                    <h2>Restaurant profile</h2>
                    <p>These details appear across Crave.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Restaurant name
                    <input
                      value={settingsForm.name}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Cuisine
                    <input
                      value={settingsForm.cuisine}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, cuisine: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      value={settingsForm.phone}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Payout UPI
                    <input
                      value={settingsForm.payoutVpa}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, payoutVpa: event.target.value })
                      }
                    />
                  </label>
                  <label className="field-wide">
                    Address
                    <textarea
                      rows={3}
                      value={settingsForm.address}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, address: event.target.value })
                      }
                    />
                  </label>
                  <label className="field-wide">
                    FSSAI licence
                    <input
                      value={settingsForm.fssai}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, fssai: event.target.value })
                      }
                    />
                  </label>
                </div>
                <button className="primary-button" type="submit">
                  Save restaurant profile
                </button>
              </form>
              <div className="settings-stack">
                <article className="settings-card notification-card">
                  <div className="card-title">
                    <span>
                      <Icon name="bell" />
                    </span>
                    <div>
                      <h2>Live order notifications</h2>
                      <p>Native alerts and vibration when a new paid order reaches your kitchen.</p>
                    </div>
                  </div>
                  <button
                    className={`large-toggle ${notificationEnabled ? 'on' : ''}`}
                    onClick={() => void toggleNotifications()}
                  >
                    <span>
                      <i />
                    </span>
                    <b>{notificationEnabled ? 'Enabled on this device' : 'Enable notifications'}</b>
                  </button>
                </article>
                <article className="settings-card account-card">
                  <div className="profile-avatar">
                    {user.name?.slice(0, 1).toUpperCase() || 'R'}
                  </div>
                  <div>
                    <h2>{user.name}</h2>
                    <p>{user.email}</p>
                    <span>Restaurant partner</span>
                  </div>
                  <button className="logout-button" onClick={() => void logout()}>
                    <Icon name="logout" /> Sign out
                  </button>
                </article>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Restaurant app navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? 'active' : ''}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
              {Boolean(item.badge) && <i>{item.badge! > 99 ? '99+' : item.badge}</i>}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="toast-message">{toast}</div>}
      {menuEditor && (
        <MenuEditor
          value={menuEditor}
          saving={savingMenu}
          onChange={setMenuEditor}
          onClose={() => setMenuEditor(null)}
          onSave={() => void saveMenuItem()}
        />
      )}
      <UpdatePrompt
        update={availableUpdate}
        installing={installingUpdate}
        error={updateError}
        onInstall={() => void installUpdate()}
        onDismiss={dismissUpdate}
      />
    </div>
  )
}
