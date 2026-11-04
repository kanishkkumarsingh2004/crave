import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Network } from '@capacitor/network'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { AccessibleDialog } from '@crave/mobile-core'
import { PullToRefresh } from './components/PullToRefresh'
import appLogo from '../assets/logo.svg'
import {
  ApiError,
  apiRequest,
  cachedRequest,
  clearApiCache,
  clearAuthToken,
  COOKIE_SESSION_TOKEN,
  getAuthToken,
  restoreAuthToken,
  saveAuthToken,
} from './api'
import { Icon } from './Icon'
import { PermissionSheet } from './PermissionSheet'
import { hasSeenPermissionSheet, markPermissionSheetSeen } from './permissions'
import {
  enableNotifications,
  initializeNative,
  notificationEnabled,
  notifyAppUpdate,
  notifyOrder,
  registerCustomerPushNotifications,
  unregisterCustomerPushNotifications,
  tap,
} from './native'
import {
  checkForCustomerUpdate,
  getInstalledVersion,
  installCustomerUpdate,
  type CustomerUpdate,
} from './update'
import { startOrderPolling, stopOrderPolling } from './background'
import { connectCustomerOrders } from './realtime'
import { startRazorpayCheckout } from './razorpay'
import { checkoutDistanceKm, roadDistanceKm } from './pricing'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'
import { useLanguage, type SupportedLocale } from '../../dictionary/react'
import type { AddressMapPoint } from './AddressMap'
import { XPStorePage } from './XPStorePage'
import type { Address, CartItem, MenuItem, Order, Restaurant, User, Variant } from './types'
import { Tab, SWIPE_TABS, TAB_ORDER, getDirection } from './navigation/tabs'
import { money, label as titleCase, shortId } from '@crave/mobile-core'
import { rupees, RESTAURANT_FALLBACK_COUNT } from './utils/format'
import { Logo } from './components/common/Logo'
import { Spinner } from './components/common/Spinner'
import { Empty } from './components/common/Empty'
import { Toggle } from './components/common/Toggle'

// Feature components
import { Auth } from './features/auth'
import { RestaurantCard } from './features/restaurants'
import { MenuScreen } from './features/menu'
import { CartPage } from './features/cart'
import { Checkout } from './features/checkout'
import { OrdersPage, InvoiceSheet } from './features/orders'
import { Account } from './features/account'
import { Addresses } from './features/addresses'

const AddressMap = lazy(() => import('./AddressMap'))

/** Languages the app can be switched to. */
/** The delivery code is only useful while the order is still on the way. Once
 * it is delivered, completed or cancelled it must never be shown again.
 */
const CLOSED_ORDER_STATUSES = ['delivered', 'completed', 'cancelled']
/** The invoice is available once the order has actually been handed over. */
const INVOICED_ORDER_STATUSES = ['delivered', 'completed']
const showDeliveryCode = (o: Order) =>
  Boolean(o.delivery_otp) && !CLOSED_ORDER_STATUSES.includes(o.status)

export default function App() {
  const { t } = useLanguage()
  const [permissionSheet, setPermissionSheet] = useState(false)
  const [savedDataHint, setSavedDataHint] = useState(false)
  const [refreshingTab, setRefreshingTab] = useState<Tab | null>(null)
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [nativeNotificationsEnabled, setNativeNotificationsEnabled] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [sliding, setSliding] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [cartRestaurant, setCartRestaurant] = useState<Restaurant | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('crave_cart_restaurant') || 'null')
    } catch {
      return null
    }
  })
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('crave_cart') || '[]')
    } catch {
      return []
    }
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [online, setOnline] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [checkout, setCheckout] = useState(false)
  const [addressPage, setAddressPage] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [deviceLoc, setDeviceLoc] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const cached = localStorage.getItem('crave_device_location')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      if (
        parsed &&
        typeof parsed.lat === 'number' &&
        typeof parsed.lng === 'number' &&
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng)
      )
        return { lat: parsed.lat, lng: parsed.lng }
    } catch {}
    return null
  })
  const [restaurantDistances, setRestaurantDistances] = useState<Map<string, number>>(new Map())
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const previous = useRef<Record<string, string>>({})
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const prevTabRef = useRef<Tab>(tab)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // P1 FIX: Track active order IDs to avoid reconnecting the WebSocket on
  // every status update (only reconnect when the set of active orders changes).
  const activeIdsRef = useRef<string[]>([])
  const activeOrderIds = useMemo(
    () =>
      orders
        .filter((order) => !['delivered', 'completed', 'cancelled'].includes(order.status))
        .map((order) => order.id)
        .sort(),
    [orders]
  )
  const selectTab = (next: Tab, dir: 'next' | 'prev' | null = null) => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    prevTabRef.current = tab
    const direction = dir ?? getDirection(tab, next)
    setDirection(direction)
    setTab(next)
    setSliding(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (direction) {
      transitionTimer.current = setTimeout(() => {
        setDirection(null)
        setSliding(false)
      }, 350)
    }
  }
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.targetTouches[0]?.clientX ?? 0
    touchEndX.current = touchStartX.current
  }
  const handleTouchMove = (event: React.TouchEvent) => {
    touchEndX.current = event.changedTouches[0]?.clientX ?? touchEndX.current
  }
  const handleTouchEnd = (event: React.TouchEvent) => {
    touchEndX.current = event.changedTouches[0]?.clientX ?? touchEndX.current
    const distance = touchStartX.current - touchEndX.current
    if (Math.abs(distance) < 50) return
    const currentIndex = SWIPE_TABS.indexOf(tab)
    if (currentIndex < 0) return
    if (distance > 0 && currentIndex < SWIPE_TABS.length - 1)
      selectTab(SWIPE_TABS[currentIndex + 1], 'next')
    if (distance < 0 && currentIndex > 0) selectTab(SWIPE_TABS[currentIndex - 1], 'prev')
  }
  useEffect(() => {
    if (!direction) return
    const raf = requestAnimationFrame(() => setSliding(true))
    return () => cancelAnimationFrame(raf)
  }, [direction])
  const showToast = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(''), 2200)
  }
  const loadRestaurants = useCallback(async () => {
    setCatalogError('')
    try {
      const response = await apiRequest<{ restaurants: Restaurant[] }>('/api/restaurants')
      const list = (response.restaurants || []).filter((restaurant) => !restaurant.is_dark_store)
      setRestaurants(list)
      // Persist restaurant coordinates to the device so distance can be computed offline.
      try {
        const coords: Record<string, { latitude: number; longitude: number }> = {}
        for (const r of list) {
          const lat = Number(r.latitude)
          const lng = Number(r.longitude)
          if (Number.isFinite(lat) && Number.isFinite(lng))
            coords[r.id] = { latitude: lat, longitude: lng }
        }
        localStorage.setItem('crave_restaurant_coords', JSON.stringify(coords))
      } catch {}
    } catch (catalogFailure) {
      setCatalogError(
        catalogFailure instanceof Error ? catalogFailure.message : 'Could not load restaurants.'
      )
    }
  }, [])
  // Fetch the device location once on app launch and persist it to the mobile DB.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDeviceLoc(location)
        try {
          localStorage.setItem(
            'crave_device_location',
            JSON.stringify({ ...location, updatedAt: Date.now() })
          )
        } catch {}
      },
      () => {
        // Keep any cached device location so distance chips still render when
        // geolocation is unavailable or permission is denied.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])
  // Compute live road distance from the device to visible restaurants.
  // P1 FIX: Only compute distances for the first 6 restaurants shown on the home
  // page to avoid N parallel OSRM requests. Results are cached in pricing.ts
  // with a 5-minute TTL by rounded coordinates.
  useEffect(() => {
    let cancelled = false
    const compute = async () => {
      const next = new Map<string, number>()
      if (deviceLoc) {
        // Only compute distances for restaurants visible on the home page (first 6)
        const visibleRestaurants = restaurants.slice(0, 6)
        await Promise.all(
          visibleRestaurants.map(async (r) => {
            const lat = Number(r.latitude)
            const lng = Number(r.longitude)
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const km = await roadDistanceKm(deviceLoc.lat, deviceLoc.lng, lat, lng)
              if (km != null) next.set(r.id, km)
            }
          })
        )
      }
      if (!cancelled) setRestaurantDistances(next)
    }
    compute()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceLoc, restaurants])
  // The cache is scoped by the account; a ref keeps it current without making
  // the loaders depend on the user object.
  const userIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  const loadAddresses = useCallback(async () => {
    try {
      const result = await cachedRequest<{ addresses: Address[] }>('/api/user/addresses', {
        maxAge: 12 * 60 * 60 * 1000,
        scope: userIdRef.current,
      })
      setAddresses(result.data.addresses || [])
      if (result.fromCache) setSavedDataHint(true)
    } catch {
      setAddresses([])
    }
  }, [])

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setOrdersLoading(true)
    setOrdersError('')
    try {
      const result = await cachedRequest<{ orders: Order[] }>('/api/orders', {
        maxAge: 5 * 60 * 1000,
        scope: userIdRef.current,
      })
      const next = result.data.orders || []
      if (result.fromCache) setSavedDataHint(true)
      for (const o of next) {
        if (previous.current[o.id] && previous.current[o.id] !== o.status)
          void notifyOrder(
            o.id,
            `Order ${titleCase(o.status)}`,
            `${o.restaurant_name || 'Your restaurant'} updated your order.`
          )
        previous.current[o.id] = o.status
      }
      setOrders(next)
    } catch (orderFailure) {
      setOrdersError(
        orderFailure instanceof Error ? orderFailure.message : 'Could not load your orders.'
      )
    } finally {
      if (!silent) setOrdersLoading(false)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    setRefreshingTab('account')
    try {
      const [me, addresses] = await Promise.all([
        apiRequest<{ authenticated: boolean; user: User }>('/api/auth/me'),
        cachedRequest<{ addresses: Address[] }>('/api/user/addresses', {
          maxAge: 0,
          scope: userIdRef.current,
        }),
      ])
      setUser(me.user)
      setAddresses(addresses.data.addresses || [])
    } catch {
      setAddresses([])
    } finally {
      setRefreshingTab(null)
    }
  }, [])

  const refreshCart = useCallback(() => {
    setRefreshingTab('cart')
    try {
      const saved = localStorage.getItem('crave_cart')
      const savedRestaurant = localStorage.getItem('crave_cart_restaurant')
      setCart(saved ? JSON.parse(saved) : [])
      setCartRestaurant(savedRestaurant ? JSON.parse(savedRestaurant) : null)
    } catch {
      setCart([])
      setCartRestaurant(null)
    } finally {
      setRefreshingTab(null)
    }
  }, [])
  useEffect(() => {
    void initializeNative()
    void loadTheme().then(setTheme)
    // The permission sheet is shown once, on the first launch.
    void hasSeenPermissionSheet().then((seen) => {
      if (!seen) setPermissionSheet(true)
    })
    // On launch, compare the checksum of the published build with the one on
    // this device. A different checksum means a new build — tell the customer.
    void (async () => {
      try {
        const available = await checkForCustomerUpdate()
        if (available) {
          await notifyAppUpdate(`CRAVE ${available.versionName} available`, available.releaseNotes)
        }
      } catch {
        // A failed check must never block the app.
      }
    })()
    // The service worker keeps the shell and the static assets on the device,
    // so the app opens instantly and works without a network.
    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      })
    }
    restoreAuthToken().then(async (token) => {
      if (!token) {
        setReady(true)
        return
      }
      try {
        const r = await apiRequest<{ authenticated: boolean; user: User }>('/api/auth/me')
        setUser(r.user)
      } catch {
        await clearAuthToken()
      } finally {
        setReady(true)
      }
    })
  }, [])
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(theme)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])
  useEffect(() => {
    let listener: { remove: () => Promise<void> } | undefined
    void Network.getStatus().then((status) => setOnline(status.connected))
    void Network.addListener('networkStatusChange', (status) => setOnline(status.connected)).then(
      (handle) => {
        listener = handle
      }
    )
    return () => void listener?.remove()
  }, [])
  useEffect(() => {
    if (!user) return
    void Promise.all([loadRestaurants(), loadAddresses(), loadOrders()])
    // P1 FIX: Increase polling interval to 30s. The WebSocket handles real-time
    // updates; polling is only a fallback for when the socket disconnects.
    const timer = window.setInterval(() => void loadOrders(true), 30000)
    return () => clearInterval(timer)
  }, [user, loadRestaurants, loadAddresses, loadOrders])
  useEffect(() => {
    if (!user) {
      setNativeNotificationsEnabled(false)
      return
    }
    void notificationEnabled().then(setNativeNotificationsEnabled)
  }, [user?.id])
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform() || !nativeNotificationsEnabled) return
    void registerCustomerPushNotifications()
  }, [user?.id, nativeNotificationsEnabled])
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform() || !nativeNotificationsEnabled) {
      if (!user) void stopOrderPolling()
      return
    }
    const token = getAuthToken()
    if (!token || token === COOKIE_SESSION_TOKEN || activeOrderIds.length === 0) {
      void stopOrderPolling()
      return
    }
    void startOrderPolling({
      token,
      userId: user.id,
      apiRequest,
      notificationsEnabled: true,
    })
    return () => {
      void stopOrderPolling()
    }
  }, [user?.id, activeOrderIds.join(','), nativeNotificationsEnabled])
  useEffect(() => {
    if (!user || getAuthToken() === COOKIE_SESSION_TOKEN) return
    // P1 FIX: Only reconnect the WebSocket when the set of active order IDs
    // actually changes (add/remove), not on every status update. Status
    // updates are delivered via the WebSocket itself, so reconnecting on
    // every status change creates a feedback loop.
    const activeIds = orders
      .filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status))
      .map((o) => o.id)
    const sorted = [...activeIds].sort()
    const prev = activeIdsRef.current
    const changed = prev.length !== sorted.length || !prev.every((id, i) => id === sorted[i])
    if (!changed) return
    activeIdsRef.current = sorted
    return connectCustomerOrders(activeIds, () => void loadOrders(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orders, loadOrders])
  useEffect(() => {
    localStorage.setItem('crave_cart', JSON.stringify(cart))
  }, [cart])
  useEffect(() => {
    if (cartRestaurant)
      localStorage.setItem('crave_cart_restaurant', JSON.stringify(cartRestaurant))
    else localStorage.removeItem('crave_cart_restaurant')
  }, [cartRestaurant])
  useEffect(() => {
    if (cart.length === 0) setCartRestaurant(null)
  }, [cart.length])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let listener: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('backButton', () => {
      if (addressPage) setAddressPage(false)
      else if (checkout) setCheckout(false)
      else if (selected) setSelected(null)
      else if (tab !== 'home') selectTab('home')
      else void CapacitorApp.minimizeApp()
    }).then((handle) => {
      listener = handle
    })
    return () => void listener?.remove()
  }, [addressPage, checkout, selected, tab])
  useEffect(() => {
    if (!user || tab !== 'home') return
    selectTab('search')
  }, [user, tab, selectTab])
  const add = (item: MenuItem, variant?: Variant) => {
    const switchingRestaurant = Boolean(
      cartRestaurant && selected && cartRestaurant.id !== selected.id
    )
    if (
      switchingRestaurant &&
      !confirm(`Start a new order from ${selected!.name}? Your current bag will be cleared.`)
    )
      return
    const r = selected!
    setCartRestaurant(r)
    const key = `${item.id}:${variant?.id || 'base'}`,
      price = Number(variant?.price ?? item.price)
    setCart((old) => {
      const current = switchingRestaurant ? [] : old
      const hit = current.find((x) => x.key === key)
      return hit
        ? current.map((x) => (x.key === key ? { ...x, quantity: x.quantity + 1 } : x))
        : [
            ...current,
            {
              key,
              itemId: item.id,
              variantId: variant?.id,
              name: item.name,
              variant: variant?.name,
              price,
              quantity: 1,
              image: item.image || item.image_url,
            },
          ]
    })
    void tap()
    showToast(`${item.name} added`)
  }
  const quantity = (key: string, d: number) =>
    setCart((old) =>
      old
        .map((x) => (x.key === key ? { ...x, quantity: x.quantity + d } : x))
        .filter((x) => x.quantity > 0)
    )
  const logout = async () => {
    setConfirmLogout(false)
    await stopOrderPolling()
    await unregisterCustomerPushNotifications()
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    // The saved copies belong to this account only.
    clearApiCache()
    setUser(null)
    setCart([])
    setCartRestaurant(null)
    setOrders([])
  }

  function requestLogout() {
    setConfirmLogout(true)
  }
  if (!ready)
    return (
      <div className="fixed inset-0 grid place-items-center gap-[34px] text-center bg-app-bg text-ink">
        <Logo />
        <Spinner />
      </div>
    )
  if (!user) return <Auth onDone={setUser} />
  if (addressPage)
    return (
      <Addresses
        items={addresses}
        onClose={() => setAddressPage(false)}
        onChanged={loadAddresses}
      />
    )
  if (checkout && cartRestaurant)
    return (
      <Checkout
        cart={cart}
        restaurant={cartRestaurant}
        user={user}
        addresses={addresses}
        onClose={() => setCheckout(false)}
        onManageAddresses={() => setAddressPage(true)}
        onPlaced={() => {
          setCheckout(false)
          setCart([])
          selectTab('orders')
          void loadOrders()
          showToast('Payment submitted for verification')
        }}
      />
    )
  if (selected)
    return (
      <>
        <MenuScreen
          restaurant={selected}
          onBack={() => setSelected(null)}
          onAdd={add}
          cart={cart}
        />
        {cart.length > 0 && (
          <button
            className="floating-cart"
            onClick={() => {
              setSelected(null)
              selectTab('cart')
            }}
          >
            <span>{cart.reduce((n, x) => n + x.quantity, 0)}</span>
            <b>View bag</b>
            <strong>{money(cart.reduce((n, x) => n + x.price * x.quantity, 0))}</strong>
          </button>
        )}
        {toast && <div className="toast">{toast}</div>}
      </>
    )
  const renderTabPage = (
    pageTab: Tab,
    mode: 'active' | 'enter' | 'exit',
    dir: 'next' | 'prev' | null
  ) => {
    const isNext = dir === 'next'
    const frameStyle: React.CSSProperties = {}
    let frameClass = 'page-frame'
    if (mode === 'active') {
      frameClass += ' active'
      frameStyle.transform = 'translateX(0)'
      frameStyle.opacity = '1'
    } else if (mode === 'enter') {
      frameClass += ` enter-${isNext ? 'next' : 'prev'}`
      frameStyle.transition = 'none'
      frameStyle.transform = isNext ? 'translateX(100%)' : 'translateX(-100%)'
      frameStyle.opacity = '1'
    } else {
      frameClass += ` exit-${isNext ? 'next' : 'prev'}`
      frameStyle.transform = 'translateX(0)'
      frameStyle.opacity = '1'
    }
    if (sliding) {
      frameStyle.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease'
      if (mode === 'enter') frameStyle.transform = 'translateX(0)'
      if (mode === 'exit') frameStyle.transform = isNext ? 'translateX(-100%)' : 'translateX(100%)'
    }

    const content =
      pageTab === 'home' ? (
        <section className="page home">
          <PullToRefresh onRefresh={loadRestaurants} refreshing={refreshingTab === 'home'}>
            <header className="home-header">
              <div>
                <p>DELIVERING TO</p>
                <button onClick={() => setAddressPage(true)}>
                  <Icon name="pin" />
                  <span>
                    {addresses.find((a) => a.is_default)?.label ||
                      addresses[0]?.label ||
                      'Add address'}
                  </span>
                  <Icon name="chevron" />
                </button>
              </div>
              <Logo compact />
            </header>
            <div className="welcome">
              <p>
                {t.customer.dashboard}, {user.name.split(' ')[0]} 👋
              </p>
              <h1>
                Good food. <em>No waiting.</em>
              </h1>
            </div>
            <button className="search-launch" onClick={() => selectTab('search')}>
              <Icon name="search" />
              {t.customer.searchPlaceholder}
            </button>
            <div className="promo">
              <div>
                <span>FIRST BITE</span>
                <h2>Tonight's sorted.</h2>
                <p>Local favourites, delivered fresh.</p>
                <button onClick={() => selectTab('search')}>
                  Explore food <Icon name="chevron" />
                </button>
              </div>
              <div className="promo-food">🍱</div>
            </div>
            <div className="title-row">
              <div>
                <p className="eyebrow">NEAR YOU</p>
                <h2>Popular right now</h2>
              </div>
              <button onClick={() => selectTab('search')}>See all</button>
            </div>
            <div className="restaurant-list">
              {restaurants.slice(0, 6).map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onOpen={() => setSelected(r)}
                  distanceKm={restaurantDistances.get(r.id)}
                />
              ))}
            </div>
            {catalogError && (
              <div className="inline-retry">
                <div className="error-box">{catalogError}</div>
                <button className="secondary" onClick={loadRestaurants}>
                  Try again
                </button>
              </div>
            )}
          </PullToRefresh>
        </section>
      ) : pageTab === 'search' ? (
        <section className="page">
          <PullToRefresh onRefresh={loadRestaurants} refreshing={refreshingTab === 'search'}>
            <header className="page-header">
              <div>
                <p className="eyebrow">DISCOVER</p>
                <h1>Find your food</h1>
              </div>
            </header>
            <div className="search-field sticky-search">
              <Icon name="search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants or cuisines"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <Icon name="close" />
                </button>
              )}
            </div>
            <h2 className="section-title">
              {search ? `Results for "${search}"` : 'All restaurants'} <span>{visible.length}</span>
            </h2>
            <div className="restaurant-list">
              {visible.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onOpen={() => setSelected(r)}
                  distanceKm={restaurantDistances.get(r.id)}
                />
              ))}
            </div>
            {catalogError && (
              <div className="inline-retry">
                <div className="error-box">{catalogError}</div>
                <button className="secondary" onClick={loadRestaurants}>
                  Try again
                </button>
              </div>
            )}
            {!visible.length && (
              <Empty
                icon="search"
                title="Nothing matched"
                text="Try another dish, restaurant or cuisine."
              />
            )}
          </PullToRefresh>
        </section>
      ) : pageTab === 'xp' ? (
        <XPStorePage onBrowse={() => selectTab('home')} />
      ) : pageTab === 'orders' ? (
        <OrdersPage
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          onRefresh={() => loadOrders()}
          refreshing={refreshingTab === 'orders'}
          customer={user}
        />
      ) : pageTab === 'cart' ? (
        <CartPage
          cart={cart}
          restaurant={cartRestaurant || undefined}
          addresses={addresses}
          onQuantity={quantity}
          onBrowse={() => selectTab('home')}
          onAddresses={() => setAddressPage(true)}
          onCheckout={() => setCheckout(true)}
          onRefresh={refreshCart}
          refreshing={refreshingTab === 'cart'}
        />
      ) : (
        <Account
          user={user}
          addresses={addresses}
          onAddresses={() => setAddressPage(true)}
          onLogout={logout}
          theme={theme}
          onTheme={(mode) => {
            setTheme(mode)
            void saveTheme(mode)
          }}
          onRefresh={loadProfile}
          refreshing={refreshingTab === 'account'}
          onNotificationStateChange={setNativeNotificationsEnabled}
        />
      )

    return (
      <div className={frameClass} style={frameStyle}>
        {content}
      </div>
    )
  }

  // Keep this as a plain derived value. This code is intentionally below the
  // authenticated early returns, where a React hook would change the hook
  // count between the signed-out and signed-in renders and crash the app.
  const visible = restaurants.filter((restaurant) =>
    `${restaurant.name} ${restaurant.cuisine || ''}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!online && (
        <div className="offline-banner">You're offline. We'll reconnect automatically.</div>
      )}
      {online && savedDataHint && (
        <div className="saved-data-banner">
          <Icon name="download" />
          <span>Showing the last saved copy. Pull to refresh when you are back online.</span>
          <button onClick={() => setSavedDataHint(false)} aria-label="Dismiss">
            <Icon name="close" />
          </button>
        </div>
      )}
      <main className="content">
        {direction ? (
          <>
            {renderTabPage(prevTabRef.current, 'exit', direction)}
            {renderTabPage(tab, 'enter', direction)}
          </>
        ) : (
          renderTabPage(tab, 'active', null)
        )}
      </main>
      {tab !== 'cart' && (
        <nav className="bottom-nav">
          {(
            [
              ['home', t.nav.home],
              ['xp', t.nav.xp],
              ['orders', t.nav.orders],
              ['cart', t.nav.bag],
              ['account', t.nav.you],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={tab === id ? 'active' : ''}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => selectTab(id)}
            >
              <span>
                <Icon name={id === 'account' ? 'user' : id === 'xp' ? 'store' : id} />
                {id === 'cart' && cart.length > 0 ? (
                  <i>{cart.reduce((n, x) => n + x.quantity, 0)}</i>
                ) : null}
              </span>
              <small>{label}</small>
            </button>
          ))}
        </nav>
      )}
      {toast && <div className="toast">{toast}</div>}
      {permissionSheet && (
        <PermissionSheet
          onNotificationStateChange={setNativeNotificationsEnabled}
          onClose={() => {
            setPermissionSheet(false)
            void markPermissionSheetSeen()
          }}
          onDone={() => {
            setPermissionSheet(false)
            void markPermissionSheetSeen()
          }}
        />
      )}
    </div>
  )
}