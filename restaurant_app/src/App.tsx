import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Network } from '@capacitor/network'
import { SplashScreen } from '@capacitor/splash-screen'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { PullToRefresh } from './components/PullToRefresh'
import appLogo from '../assets/logo.svg'
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
import { PermissionSheet } from './PermissionSheet'
import {
  getNotificationPreference,
  initializeNativeAppearance,
  notifyRestaurantAppUpdate,
  requestNotificationPermission,
  setNotificationPreference,
  showKitchenNotification,
} from './native'
import { connectRestaurantEvents } from './realtime'
import { checkForRestaurantUpdate, installRestaurantUpdate, type RestaurantUpdate } from './update'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'
import { useLanguage, type SupportedLocale } from '../../dictionary/react'
import { hasSeenPermissionSheet, markPermissionSheetSeen } from './permissions'
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

/**
 * Rejects a promise after `ms` milliseconds so a native plugin (e.g. StatusBar or the
 * notification channel) can never stall the boot flow. Falls back to the resolved value.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error(`Boot step timed out after ${ms}ms`))
    }, ms)
    promise
      .then((value) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

const CATEGORY_OPTIONS = [
  'General',
  'Breakfast',
  'Lunch Specials',
  'Dinner Specials',
  'Biryani, Rice & Pulao',
  'Rice Bowls',
  'North Indian Curries',
  'Punjabi',
  'Mughlai',
  'Rajasthani',
  'Gujarati',
  'Bengali',
  'Kashmiri',
  'Maharashtrian',
  'Goan',
  'Kerala',
  'Andhra',
  'Hyderabadi',
  'South Indian & Dosa',
  'Idli & Vada',
  'Thali & Combos',
  'Dal & Khichdi',
  'Roti, Naan & Breads',
  'Starters & Appetizers',
  'Soups & Salads',
  'Tandoor & Kebabs',
  'Momos & Dumplings',
  'Chinese',
  'Thai',
  'Japanese & Sushi',
  'Korean',
  'Continental',
  'Mediterranean',
  'Mexican',
  'Italian',
  'Burgers & Sandwiches',
  'Pizza',
  'Pasta',
  'Rolls & Wraps',
  'Noodles',
  'Seafood',
  'Chicken',
  'Mutton',
  'Egg Dishes',
  'Vegetarian',
  'Vegan',
  'Healthy & Diet',
  'Jain Food',
  'Street Food',
  'Chaat',
  'Snacks',
  'Bakery',
  'Cakes',
  'Beverages',
  'Tea & Coffee',
  'Juices & Shakes',
  'Ice Cream',
  'Desserts & Sweets',
]

const EMPTY_EDITOR: MenuEditorValue = {
  name: '',
  category: CATEGORY_OPTIONS[0],
  description: '',
  restaurantPrice: '',
  image: '',
  isVeg: true,
  inStock: true,
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
          <img className="brand-mark" src={appLogo} alt="Crave" />
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

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

/** Languages the app can be switched to. */
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

function CategoryPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const query = searchTerm.trim().toLowerCase()
  const options = CATEGORY_OPTIONS.filter((category) => category.toLowerCase().includes(query))

  return (
    <div className="category-field">
      <label htmlFor="menu-category">Category</label>
      <div className="category-picker">
        <Icon name="search" />
        <input
          id="menu-category"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setSearchTerm(event.target.value)
            setOpen(true)
          }}
          onFocus={(event) => {
            setSearchTerm('')
            setOpen(true)
            event.currentTarget.select()
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Search or enter a category"
          autoComplete="off"
        />
        {open && (
          <div className="category-options" role="listbox" aria-label="Food categories">
            {options.length > 0 ? (
              options.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={category === value ? 'selected' : ''}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(category)
                    setSearchTerm(category)
                    setOpen(false)
                  }}
                >
                  {category}
                  {category === value && <Icon name="check" />}
                </button>
              ))
            ) : (
              <span>Use “{value}” as a custom category</span>
            )}
          </div>
        )}
      </div>
    </div>
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
    onChange({
      ...value,
      useSizes: true,
      variants: ['Small', 'Medium', 'Large'].map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        restaurant_price: restaurantPrice,
        price: restaurantPrice,
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

  function updateBasePrice(restaurantPrice: string) {
    const numericPrice = Number(restaurantPrice || 0)
    onChange({
      ...value,
      restaurantPrice,
      variants: value.variants.map((variant) =>
        variant.name.toLowerCase() === 'small'
          ? { ...variant, restaurant_price: numericPrice, price: numericPrice }
          : variant
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
          <CategoryPicker
            value={value.category}
            onChange={(category) => onChange({ ...value, category })}
          />
          <label>
            Portion / unit
            <input
              value={value.unit}
              onChange={(event) => onChange({ ...value, unit: event.target.value })}
              placeholder="Serves 1"
            />
          </label>
          <label>
            {value.useSizes ? 'Small price' : 'Restaurant price'}
            <input
              inputMode="numeric"
              value={value.restaurantPrice}
              onChange={(event) => updateBasePrice(event.target.value)}
              placeholder="₹0"
            />
            <small className="price-helper">
              Your customer price is calculated automatically from the restaurant contract.
            </small>
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
              <div className="variant-title">
                <strong>Medium and large prices</strong>
                <span>Small uses the price entered above.</span>
              </div>
              {value.variants
                .filter((variant) => variant.name.toLowerCase() !== 'small')
                .map((variant) => (
                  <div className="variant-row" key={variant.id}>
                    <strong>{variant.name}</strong>
                    <input
                      inputMode="numeric"
                      value={variant.restaurant_price}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          restaurant_price: Number(event.target.value || 0),
                          price: Number(event.target.value || 0),
                        })
                      }
                      aria-label={`${variant.name} restaurant price`}
                      placeholder="₹0"
                    />
                  </div>
                ))}
            </div>
          )}
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
  const [busyMenuStock, setBusyMenuStock] = useState<Record<string, boolean>>({})
  const [restaurantTogglePending, setRestaurantTogglePending] = useState(false)
  const [menuEditor, setMenuEditor] = useState<MenuEditorValue | null>(null)
  const [savingMenu, setSavingMenu] = useState(false)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null)
  const [toast, setToast] = useState('')
  const [availableUpdate, setAvailableUpdate] = useState<RestaurantUpdate | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [passwordSheet, setPasswordSheet] = useState(false)
  const [updateSheet, setUpdateSheet] = useState(false)
  const [languageSheet, setLanguageSheet] = useState(false)
  const [permissionSheet, setPermissionSheet] = useState(false)
  const { t, locale: language, setLocale, languages } = useLanguage()
  const setLanguage = (code: SupportedLocale) => void setLocale(code)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
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
  // Keep these refs mounted on every render, including the login screen.
  useEffect(() => {
    ordersRef.current = orders
  }, [orders])

  useEffect(() => {
    void bootstrap()
    void loadTheme().then(setTheme)
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(theme)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])

  useEffect(() => {
    void refreshUpdateStatus()
  }, [])

  useEffect(() => {
    if (activeTab === 'settings') void refreshUpdateStatus()
  }, [activeTab])

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
          // On launch, compare the published build's checksum with the one on
          // this device. A different checksum means a new build — tell the
          // restaurant partner.
          void (async () => {
            try {
              const available = await checkForRestaurantUpdate()
              if (available) {
                await notifyRestaurantAppUpdate(
                  `Crave Kitchen ${available.versionName} available`,
                  available.releaseNotes
                )
              }
            } catch {
              // A failed check must never block the app.
            }
          })()
        }
      }),
      CapacitorApp.addListener('backButton', () => {
        if (alert) setAlert(null)
        else if (menuEditor) setMenuEditor(null)
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
  }, [activeTab, alert, menuEditor, restaurant?.id])

  async function bootstrap() {
    // Hide the native preloader the moment the web app is interactive. It must never
    // depend on native appearance setup succeeding, otherwise a stalled StatusBar or
    // notification channel leaves the app on a plain dark screen forever.
    // Do not await this native bridge call: on a device with a stalled bridge, awaiting
    // it would prevent the React app's boot timeout from ever being registered.
    void SplashScreen.hide().catch(() => undefined)
    // Safety net: if any boot step hangs (network, native plugin), still dismiss the
    // preloader so a reload can never leave the app stuck on the splash screen.
    const bootTimer = window.setTimeout(() => setBooting(false), 8000)
    try {
      await withTimeout(initializeNativeAppearance(), 4000)
      const token = await restoreAuthToken()
      setNotificationEnabled(await getNotificationPreference())
      // The permission sheet is shown once, on the first launch.
      void hasSeenPermissionSheet().then((seen) => {
        if (!seen) setPermissionSheet(true)
      })
      if (!token) return
      const result = await apiRequest<{ authenticated: boolean; user: RestaurantUser }>(
        '/api/auth/me',
        { token }
      )
      if (result.authenticated && result.user) await startSession(result.user)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await clearAuthToken()
    } finally {
      window.clearTimeout(bootTimer)
      setBooting(false)
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

  async function refreshUpdateStatus() {
    if (updateCheckRunningRef.current) return
    updateCheckRunningRef.current = true
    setCheckingUpdate(true)
    setUpdateError('')
    try {
      const update = await checkForRestaurantUpdate()
      setAvailableUpdate(update)
      if (update)
        await notifyRestaurantAppUpdate(
          `CRAVE Restaurant ${update.versionName} available`,
          update.releaseNotes
        )
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Unable to check for updates.')
    } finally {
      setCheckingUpdate(false)
      updateCheckRunningRef.current = false
    }
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
    if (!restaurant || restaurantTogglePending) return
    const previousRestaurant = restaurant
    const nextIsOpen = !restaurant.is_open
    setRestaurant({ ...restaurant, is_open: nextIsOpen })
    setRestaurantTogglePending(true)
    try {
      const result = await apiRequest<{ restaurant: Restaurant }>('/api/restaurants', {
        method: 'PATCH',
        body: { id: restaurant.id, is_open: nextIsOpen },
      })
      setRestaurant(result.restaurant)
      showToast(
        result.restaurant.is_open ? 'Restaurant is accepting orders.' : 'Restaurant is offline.'
      )
    } catch (error) {
      setRestaurant(previousRestaurant)
      showToast(error instanceof Error ? error.message : 'Unable to update restaurant status.')
    } finally {
      setRestaurantTogglePending(false)
    }
  }

  function editMenuItem(item?: MenuItem) {
    if (!item) {
      setMenuEditor({ ...EMPTY_EDITOR })
      return
    }
    const smallPrice =
      item.variants.find((variant) => variant.name.toLowerCase() === 'small')?.restaurant_price ??
      item.restaurant_price
    const normalizedVariants = ['Small', 'Medium', 'Large'].map((name, index) => {
      const existing = item.variants.find(
        (variant) => variant.name.toLowerCase() === name.toLowerCase()
      )
      return (
        existing || {
          id: crypto.randomUUID(),
          name,
          restaurant_price: Number(smallPrice || 0),
          price: Number(smallPrice || 0),
          in_stock: true,
          is_default: index === 0,
        }
      )
    })
    setMenuEditor({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      restaurantPrice: String(smallPrice),
      image: item.image,
      isVeg: item.is_veg,
      inStock: item.in_stock,
      unit: item.unit || 'Serves 1',
      useSizes: item.variants.length > 0,
      variants: item.variants.length > 0 ? normalizedVariants : [],
    })
  }

  async function saveMenuItem() {
    if (!restaurant || !menuEditor) return
    const restaurantPrice = Math.round(Number(menuEditor.restaurantPrice))
    if (
      !menuEditor.name.trim() ||
      !menuEditor.category.trim() ||
      !Number.isFinite(restaurantPrice)
    ) {
      showToast('Dish name, category and restaurant price are required.')
      return
    }
    if (restaurantPrice < 0) {
      showToast('Restaurant price must be zero or more.')
      return
    }
    if (
      menuEditor.useSizes &&
      menuEditor.variants.some((variant) => variant.restaurant_price < 0)
    ) {
      showToast('Every size needs a valid restaurant price.')
      return
    }

    setSavingMenu(true)
    try {
      const payload = {
        ...(menuEditor.id ? { id: menuEditor.id } : {}),
        restaurant_id: restaurant.id,
        name: menuEditor.name.trim(),
        category: menuEditor.category.trim(),
        description: menuEditor.description.trim() || null,
        restaurant_price: restaurantPrice,
        price: restaurantPrice,
        image: menuEditor.image.trim() || null,
        is_veg: menuEditor.isVeg,
        in_stock: menuEditor.inStock,
        unit: menuEditor.unit.trim() || null,
        hsn_sac_code: '996331',
        price_tax_mode: 'TAX_INCLUSIVE',
        variants: menuEditor.useSizes
          ? menuEditor.variants.map((variant, index) => ({
              ...variant,
              restaurant_price: Math.round(variant.restaurant_price),
              price: Math.round(variant.restaurant_price),
              is_default: index === 0,
            }))
          : [],
      }
      const result = await apiRequest<{ item: MenuItem }>('/api/menu-items', {
        method: menuEditor.id ? 'PATCH' : 'POST',
        body: payload,
      })
      const savedItem = formatMenuItem(result.item, restaurant.id)
      setMenuItems((current) => {
        const exists = current.some((item) => item.id === savedItem.id)
        const next = exists
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [...current, savedItem]
        return next.sort(
          (left, right) =>
            left.category.localeCompare(right.category) || left.name.localeCompare(right.name)
        )
      })
      setMenuEditor(null)
      showToast(menuEditor.id ? 'Dish updated.' : 'Dish added to the live menu.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save dish.')
    } finally {
      setSavingMenu(false)
    }
  }

  async function toggleMenuStock(item: MenuItem) {
    if (busyMenuStock[item.id]) return
    const nextInStock = !item.in_stock
    setMenuItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, in_stock: nextInStock } : entry))
    )
    setBusyMenuStock((current) => ({ ...current, [item.id]: true }))
    try {
      const result = await apiRequest<{ item: MenuItem }>('/api/menu-items', {
        method: 'PATCH',
        body: { id: item.id, in_stock: nextInStock },
      })
      setMenuItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, ...formatMenuItem(result.item, item.restaurant_id) }
            : entry
        )
      )
    } catch (error) {
      setMenuItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, in_stock: item.in_stock } : entry
        )
      )
      showToast(error instanceof Error ? error.message : 'Unable to update dish.')
    } finally {
      setBusyMenuStock((current) => ({ ...current, [item.id]: false }))
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

  async function changePassword(event: FormEvent) {
    event.preventDefault()
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
    if (!confirmPassword || confirmPassword.length < 8 || confirmPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Confirm password must be between 8 and 256 characters.',
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

    setChangingPassword(true)
    try {
      const result = await apiRequest<{ success: boolean; message?: string }>(
        '/api/user/change-password',
        {
          method: 'POST',
          body: { currentPassword, newPassword, confirmPassword },
        }
      )
      if (!result.success) throw new Error(result.message || 'Unable to change your password.')

      setPasswordFeedback({
        type: 'success',
        message: result.message || 'Password changed successfully.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to change your password.',
      })
    } finally {
      setChangingPassword(false)
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
    if (!confirmLogout) return
    setConfirmLogout(false)
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    setUser(null)
    setRestaurant(null)
    setOrders([])
    setMenuItems([])
    setSettlements([])
    setActiveTab('home')
  }

  function requestLogout() {
    setConfirmLogout(true)
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
      <main className="splash-screen">
        <img className="brand-mark splash-mark" src={appLogo} alt="Crave" />
        <strong>crave.</strong>
        <span className="loader-line">
          <i />
        </span>
      </main>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />
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
          <img className="brand-logo" src={appLogo} alt="Crave" />
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

      <PullToRefresh onRefresh={() => void refreshAll()} refreshing={refreshing}>
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
                  className={`store-switch ${restaurant?.is_open ? 'online' : ''} ${restaurantTogglePending ? 'saving' : ''}`}
                  onClick={() => void toggleRestaurant()}
                  disabled={restaurantTogglePending}
                  aria-pressed={restaurant?.is_open}
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
                              {variant.name} {money(variant.restaurant_price)}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="menu-price-row">
                        <div>
                          <small>Restaurant price</small>
                          <strong>{money(item.restaurant_price)}</strong>
                        </div>
                        <button
                          className={`mini-switch ${item.in_stock ? 'on' : ''} ${busyMenuStock[item.id] ? 'saving' : ''}`}
                          onClick={() => void toggleMenuStock(item)}
                          disabled={busyMenuStock[item.id]}
                          aria-label={`${item.in_stock ? 'Mark' : 'Restore'} ${item.name} ${item.in_stock ? 'unavailable' : 'available'}`}
                          aria-pressed={item.in_stock}
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
                <StatCard
                  label="Pending payout"
                  value={money(salesMetrics.pending)}
                  tone="violet"
                />
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
                      <div className="readonly-field">
                        {settingsForm.name || restaurant?.name || '-'}
                      </div>
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
                      <div className="readonly-field multiline">
                        {settingsForm.address || restaurant?.address || '-'}
                      </div>
                    </label>
                    <label className="field-wide">
                      FSSAI licence
                      <div className="readonly-field">
                        {settingsForm.fssai || restaurant?.fssai_license || '-'}
                      </div>
                    </label>
                  </div>
                  <button className="primary-button" type="submit">
                    Save restaurant profile
                  </button>
                </form>
                <div className="settings-stack">
                  <article className="settings-card theme-card">
                    <div className="card-title">
                      <span className="theme-symbol">◐</span>
                      <div>
                        <h2>Appearance</h2>
                        <p>Use a light, dark, or device-controlled theme.</p>
                      </div>
                    </div>
                    <div className="theme-control" role="group" aria-label="Restaurant app theme">
                      {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                        <button
                          key={mode}
                          className={theme === mode ? 'active' : ''}
                          onClick={() => {
                            setTheme(mode)
                            void saveTheme(mode)
                          }}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                  </article>
                  <article className="settings-card notification-card">
                    <div className="card-title">
                      <span>
                        <Icon name="bell" />
                      </span>
                      <div>
                        <h2>Live order notifications</h2>
                        <p>
                          Native alerts and vibration when a new paid order reaches your kitchen.
                        </p>
                      </div>
                    </div>
                    <button
                      className={`large-toggle ${notificationEnabled ? 'on' : ''}`}
                      onClick={() => void toggleNotifications()}
                    >
                      <span>
                        <i />
                      </span>
                      <b>
                        {notificationEnabled ? 'Enabled on this device' : 'Enable notifications'}
                      </b>
                    </button>
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
                            ? 'Checking for the latest restaurant app…'
                            : availableUpdate
                              ? `Version ${availableUpdate.versionName} is available`
                              : updateError || 'You are using the latest available version.'}
                        </small>
                      </span>
                      <Icon name="chevron" />
                    </button>
                    <button onClick={() => setPasswordSheet(true)}>
                      <span className="settings-list-icon">
                        <Icon name="settings" />
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
                  <article className="settings-card account-card">
                    <div className="profile-avatar">
                      {user.name?.slice(0, 1).toUpperCase() || 'R'}
                    </div>
                    <div>
                      <h2>{user.name}</h2>
                      <p>{user.email}</p>
                      <span>Restaurant partner</span>
                    </div>
                    <button className="logout-button" onClick={requestLogout}>
                      <Icon name="logout" /> Sign out
                    </button>
                  </article>
                </div>
              </div>
            </section>
          )}
        </main>
      </PullToRefresh>

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
                <span className="eyebrow">Restaurant app</span>
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
            <article className={`settings-card software-card ${availableUpdate ? 'ready' : ''}`}>
              <div className="card-title">
                <span>
                  <Icon name="download" />
                </span>
                <div>
                  <h2>App update</h2>
                  <p>
                    {checkingUpdate
                      ? 'Checking for the latest restaurant app…'
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
            </article>{' '}
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
            <p>Keep your restaurant partner account secure with a new sign-in password.</p>
            <form className="password-form" onSubmit={changePassword} noValidate>
              <label>
                Current password
                <span className="password-field">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    aria-label={
                      showCurrentPassword ? 'Hide current password' : 'Show current password'
                    }
                  >
                    {showCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <label>
                New password
                <span className="password-field">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="8–256 characters"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <label>
                Confirm new password
                <span className="password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirmation password'
                        : 'Show confirmation password'
                    }
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <p className="password-helper">New passwords must be 8–256 characters long.</p>
              {passwordFeedback && (
                <p
                  className={`password-feedback ${passwordFeedback.type}`}
                  role={passwordFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {passwordFeedback.message}
                </p>
              )}
              <button className="primary-button" type="submit" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <span className="button-spinner dark" /> Updating password…
                  </>
                ) : (
                  'Change password'
                )}
              </button>
            </form>{' '}
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
          aria-labelledby="restaurant-logout-title"
          onClick={() => setConfirmLogout(false)}
        >
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <div>
                <span className="eyebrow">Confirm sign out</span>
                <h2 id="restaurant-logout-title">Really sign out?</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setConfirmLogout(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </header>
            <p>You will be signed out of the restaurant app. You can sign back in anytime.</p>
            <div className="form-grid" style={{ marginTop: 12, gap: 10 }}>
              <button className="secondary-button" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={() => void logout()}>
                <Icon name="logout" /> Sign out
              </button>
            </div>
          </section>
        </div>
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

      <nav className="bottom-nav" aria-label="Restaurant app navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
            aria-current={activeTab === item.id ? 'page' : undefined}
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
    </div>
  )
}
