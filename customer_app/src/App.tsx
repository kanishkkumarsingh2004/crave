import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Network } from '@capacitor/network'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
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
import { Icon } from './Icon'
import {
  enableNotifications,
  initializeNative,
  notificationEnabled,
  notifyAppUpdate,
  notifyOrder,
  tap,
} from './native'
import { checkForCustomerUpdate, installCustomerUpdate, type CustomerUpdate } from './update'
import { connectCustomerOrders } from './realtime'
import { openUpiPayment, type UpiPaymentApp } from './payment'
import { checkoutDistanceKm } from './pricing'
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from './theme'
import type { AddressMapPoint } from './AddressMap'
import type { Address, CartItem, MenuItem, Order, Restaurant, User, Variant } from './types'

type Tab = 'home' | 'search' | 'orders' | 'cart' | 'account'
const money = (value: number) => `₹${Math.round(Number(value) || 0)}`
const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const RESTAURANT_FALLBACK_COUNT = 5
const AddressMap = lazy(() => import('./AddressMap'))

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <img className="brand-mark" src={appLogo} alt="Crave" />
      {!compact && <span>CRAVE.</span>}
    </div>
  )
}
function Spinner() {
  return <span className="spinner" />
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: 'search' | 'orders' | 'cart'
  title: string
  text: string
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span />
    </button>
  )
}

function Auth({ onDone }: { onDone: (u: User) => void }) {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false)
  const [error, setError] = useState(''),
    [form, setForm] = useState({ name: '', email: '', phone: '', password: '', address: '' })
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      let signupCoordinates: { latitude?: number; longitude?: number } = {}
      if (signup && form.address.trim()) {
        try {
          const geocode = await apiRequest<{
            results: Array<{ lat: number; lng: number }>
          }>(`/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`)
          const match = geocode.results?.[0]
          if (match) signupCoordinates = { latitude: match.lat, longitude: match.lng }
        } catch {}
      }
      const data = signup
        ? await apiRequest<{ token?: string; user: User }>('/api/auth/signup', {
            method: 'POST',
            body: { ...form, ...signupCoordinates, role: 'user' },
          })
        : await apiRequest<{ token?: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: { email: form.email, password: form.password },
          })
      let sessionUser = data.user
      if (data.token) {
        await saveAuthToken(data.token)
      } else {
        const cookieSession = await apiRequest<{ authenticated: boolean; user?: User }>(
          '/api/auth/me',
          { token: '' }
        )
        if (!cookieSession.authenticated || !cookieSession.user) {
          throw new Error('Sign-in succeeded, but the secure app session could not be restored.')
        }
        sessionUser = cookieSession.user
        await saveAuthToken(COOKIE_SESSION_TOKEN)
      }
      onDone(sessionUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-screen">
      <div className="auth-art">
        <div className="floating-card card-one">
          Hot meals
          <br />
          <b>delivered.</b>
        </div>
        <div className="food-orb">🍜</div>
        <div className="floating-card card-two">
          <span>4.9 ★</span>
          <small>local favourites</small>
        </div>
      </div>
      <section className="auth-sheet">
        <Logo />
        <p className="eyebrow">FOOD, RIGHT NOW</p>
        <h1>{signup ? 'Your next favourite meal starts here.' : 'What are you craving today?'}</h1>
        <p className="auth-copy">
          Discover local kitchens, pay securely with UPI and follow every order live.
        </p>
        <form onSubmit={submit}>
          {signup && (
            <>
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  inputMode="tel"
                  placeholder="Mobile number"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoCapitalize="none"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                required
                minLength={8}
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {signup && (
            <label>
              Delivery address
              <textarea
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House, street, landmark, city"
              />
            </label>
          )}
          {error && <div className="error-box">{error}</div>}
          <button className="primary wide" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Please wait
              </>
            ) : signup ? (
              'Create my account'
            ) : (
              'Open CRAVE.'
            )}
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setSignup(!signup)
            setError('')
          }}
        >
          {signup ? 'Already have an account? Sign in' : 'New to CRAVE? Create an account'}
        </button>
      </section>
    </main>
  )
}

function RestaurantCard({
  restaurant,
  onOpen,
  favourite,
  onFavourite,
}: {
  restaurant: Restaurant
  onOpen: () => void
  favourite: boolean
  onFavourite: () => void
}) {
  return (
    <article className="restaurant-card" onClick={onOpen}>
      <div
        className={`restaurant-image${
          restaurant.image
            ? ''
            : ` restaurant-image-fallback-${restaurant.name.length % RESTAURANT_FALLBACK_COUNT}`
        }`}
        style={
          restaurant.image
            ? {
                background: `linear-gradient(0deg,rgba(0,0,0,.38),transparent),url(${restaurant.image}) center/cover`,
              }
            : undefined
        }
      >
        {restaurant.offer && <span className="offer">{restaurant.offer}</span>}
        <button
          className={`heart ${favourite ? 'liked' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onFavourite()
          }}
        >
          <Icon name="heart" />
        </button>
        {!restaurant.is_open && <span className="closed">Currently closed</span>}
      </div>
      <div className="restaurant-info">
        <div>
          <h3>{restaurant.name}</h3>
          <p>{restaurant.cuisine || 'Fresh local food'}</p>
        </div>
        <span className="rating">{Number(restaurant.rating || 4.5).toFixed(1)} ★</span>
      </div>
      <div className="meta">
        <span>
          <Icon name="clock" /> {restaurant.eta || '25–35 min'}
        </span>
        <span>•</span>
        <span>{restaurant.distance || 'Nearby'}</span>
        <span>•</span>
        <span>{money(restaurant.cost_for_two || 300)} for two</span>
      </div>
    </article>
  )
}

function DishImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const hasImage = Boolean(src && !failed)

  return (
    <div className={`dish-image${hasImage ? '' : ' dish-image-placeholder'}`}>
      {hasImage ? (
        <img src={src} alt={`${name} dish`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">🍽️</span>
      )}
    </div>
  )
}

function MenuScreen({
  restaurant,
  onBack,
  onAdd,
  cart,
}: {
  restaurant: Restaurant
  onBack: () => void
  onAdd: (item: MenuItem, v?: Variant) => void
  cart: CartItem[]
}) {
  const [items, setItems] = useState<MenuItem[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [retry, setRetry] = useState(0),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('All'),
    [pick, setPick] = useState<MenuItem | null>(null)
  useEffect(() => {
    setLoading(true)
    setLoadError('')
    apiRequest<{ items: MenuItem[] }>(
      `/api/menu-items?restaurantId=${encodeURIComponent(restaurant.id)}`
    )
      .then((r) => setItems(r.items || []))
      .catch((menuError) =>
        setLoadError(menuError instanceof Error ? menuError.message : 'Could not load this menu.')
      )
      .finally(() => setLoading(false))
  }, [restaurant.id, retry])
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((x) => x.category || 'Popular')))],
    [items]
  )
  const filtered = items.filter(
    (x) =>
      (category === 'All' || (x.category || 'Popular') === category) &&
      `${x.name} ${x.description || x.detail || ''}`.toLowerCase().includes(query.toLowerCase())
  )
  const count = (id: string) =>
    cart.filter((x) => x.itemId === id).reduce((n, x) => n + x.quantity, 0)
  const add = (item: MenuItem) => {
    const variants = (item.variants || []).filter((v) => v.in_stock !== false)
    if (
      restaurant.is_open === false ||
      item.in_stock === false ||
      item.is_available === false ||
      ((item.variants?.length || 0) > 0 && variants.length === 0)
    )
      return
    if (variants.length > 1) setPick(item)
    else onAdd(item, variants[0])
  }
  return (
    <div className="detail-screen">
      <header
        className="detail-hero"
        style={{
          background: restaurant.image
            ? `linear-gradient(0deg,var(--hero-overlay-strong),var(--hero-overlay-soft)),url(${restaurant.image}) center/cover`
            : 'var(--hero-fallback)',
        }}
      >
        <button className="round" onClick={onBack}>
          <Icon name="back" />
        </button>
        <button className="round">
          <Icon name="heart" />
        </button>
        <div>
          <span className="open-pill">{restaurant.is_open === false ? 'Closed' : 'Open now'}</span>
          <h1>{restaurant.name}</h1>
          <p>
            {restaurant.cuisine || 'Fresh local food'} · {restaurant.eta || '25–35 min'}
          </p>
        </div>
      </header>
      <div className="detail-body">
        <div className="delivery-note">
          <Icon name="clock" />
          <span>
            <b>Fast delivery</b>
            <small>Prepared fresh after you order</small>
          </span>
          <strong>{restaurant.rating || 4.5} ★</strong>
        </div>
        <div className="search-field">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${restaurant.name}`}
          />
        </div>
        <div className="chips">
          {categories.map((c) => (
            <button
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
        <h2 className="section-title">
          Menu <span>{filtered.length} items</span>
        </h2>
        {loading ? (
          <div className="loading">
            <Spinner /> Loading fresh dishes
          </div>
        ) : loadError ? (
          <div className="inline-retry">
            <div className="error-box">{loadError}</div>
            <button className="secondary" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <Empty icon="search" title="No dishes found" text="Try a different search or category." />
        ) : (
          <div className="menu-list">
            {filtered.map((item) => {
              const variants = (item.variants || []).filter((v) => v.in_stock !== false)
              const image = item.image || item.image_url
              const unavailable =
                restaurant.is_open === false ||
                item.in_stock === false ||
                item.is_available === false ||
                ((item.variants?.length || 0) > 0 && variants.length === 0)
              const from = variants.length
                ? Math.min(...variants.map((v) => Number(v.price)))
                : Number(item.price)
              return (
                <article className="menu-item" key={item.id}>
                  <div className="veg-dot">
                    <i className={(item.is_veg ?? item.veg) !== false ? 'veg' : 'nonveg'} />
                  </div>
                  <div className="menu-copy">
                    <small>{item.category || 'Popular'}</small>
                    <h3>{item.name}</h3>
                    <strong>
                      {variants.length > 1 ? 'From ' : ''}
                      {money(from)}
                    </strong>
                    <p>
                      {item.description ||
                        item.detail ||
                        'Freshly prepared with quality ingredients.'}
                    </p>
                  </div>
                  <div className="menu-action">
                    <DishImage src={image} name={item.name} />
                    <button disabled={unavailable} onClick={() => add(item)}>
                      {unavailable
                        ? restaurant.is_open === false
                          ? 'CLOSED'
                          : 'SOLD OUT'
                        : count(item.id)
                          ? `ADD · ${count(item.id)}`
                          : 'ADD +'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      {pick &&
        createPortal(
          <div className="modal-backdrop animated-backdrop" onClick={() => setPick(null)}>
            <section className="bottom-sheet animated-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-title">
                <div>
                  <p className="eyebrow">CHOOSE A SIZE</p>
                  <h2>{pick.name}</h2>
                </div>
                <button className="round pale" onClick={() => setPick(null)}>
                  <Icon name="close" />
                </button>
              </div>
              <div className="variant-list">
                {(pick.variants || [])
                  .filter((v) => v.in_stock !== false)
                  .map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        onAdd(pick, v)
                        setPick(null)
                      }}
                    >
                      <span>
                        <b>{v.name}</b>
                        <small>Freshly made</small>
                      </span>
                      <strong>
                        {money(v.price)} <Icon name="plus" />
                      </strong>
                    </button>
                  ))}
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  )
}

function CartPage({
  cart,
  restaurant,
  onQuantity,
  onBrowse,
  onCheckout,
}: {
  cart: CartItem[]
  restaurant?: Restaurant
  onQuantity: (k: string, d: number) => void
  onBrowse: () => void
  onCheckout: () => void
}) {
  const subtotal = cart.reduce((n, x) => n + x.price * x.quantity, 0)
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">YOUR ORDER</p>
        <h1>Bag</h1>
        <span>{cart.reduce((n, x) => n + x.quantity, 0)} items</span>
      </header>
      {!cart.length ? (
        <>
          <Empty
            icon="cart"
            title="Your bag is hungry"
            text="Add something delicious and it will show up here."
          />
          <button className="primary center" onClick={onBrowse}>
            Browse restaurants
          </button>
        </>
      ) : (
        <>
          <div className="cart-restaurant">
            <div className="mini-logo">{restaurant?.name?.[0] || 'C'}</div>
            <span>
              <small>ORDERING FROM</small>
              <b>{restaurant?.name || 'Restaurant'}</b>
            </span>
          </div>
          <div className="cart-items">
            {cart.map((x) => (
              <article key={x.key}>
                <div className="veg-dot">
                  <i className="veg" />
                </div>
                <div>
                  <h3>{x.name}</h3>
                  {x.variant && <p>{x.variant}</p>}
                  <strong>{money(x.price)}</strong>
                </div>
                <div className="stepper">
                  <button onClick={() => onQuantity(x.key, -1)}>
                    <Icon name="minus" />
                  </button>
                  <b>{x.quantity}</b>
                  <button onClick={() => onQuantity(x.key, 1)}>
                    <Icon name="plus" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="bill-preview">
            <span>
              Item total <b>{money(subtotal)}</b>
            </span>
            <p>Delivery, packaging and taxes are calculated securely at checkout.</p>
          </div>
          <div className="sticky-action">
            <div>
              <small>ITEM TOTAL</small>
              <strong>{money(subtotal)}</strong>
            </div>
            <button className="primary" onClick={onCheckout}>
              Continue <Icon name="chevron" />
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function Checkout({
  cart,
  restaurant,
  user,
  addresses,
  onClose,
  onPlaced,
}: {
  cart: CartItem[]
  restaurant: Restaurant
  user: User
  addresses: Address[]
  onClose: () => void
  onPlaced: () => void
}) {
  const subtotal = cart.reduce((n, x) => n + x.price * x.quantity, 0),
    [selected, setSelected] = useState(
      addresses.find((x) => x.is_default)?.id || addresses[0]?.id || ''
    ),
    [utr, setUtr] = useState(''),
    [coupon, setCoupon] = useState(''),
    [couponInput, setCouponInput] = useState(''),
    [couponApplying, setCouponApplying] = useState(false),
    [couponToast, setCouponToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
      null
    ),
    [tip, setTip] = useState(0),
    [tipInput, setTipInput] = useState(''),
    [busy, setBusy] = useState(false),
    [paid, setPaid] = useState(false),
    [paymentPicker, setPaymentPicker] = useState(false),
    [error, setError] = useState(''),
    [billing, setBilling] = useState<any>(null),
    [config, setConfig] = useState<any>(null),
    [pricingError, setPricingError] = useState('')
  const couponApplyRequest = useRef<string | null>(null)
  const couponToastTimer = useRef<number | undefined>(undefined)
  const showCouponToast = useCallback((message: string, type: 'success' | 'error') => {
    if (couponToastTimer.current) window.clearTimeout(couponToastTimer.current)
    setCouponToast({ message, type })
    couponToastTimer.current = window.setTimeout(() => setCouponToast(null), 3200)
  }, [])

  useEffect(
    () => () => {
      if (couponToastTimer.current) window.clearTimeout(couponToastTimer.current)
    },
    []
  )

  useEffect(() => {
    const address = addresses.find((entry) => entry.id === selected)
    const requestedCoupon = coupon
    let cancelled = false
    setBilling(null)
    setPricingError('')
    Promise.all([
      apiRequest<any>('/api/payment-config'),
      apiRequest<any>('/api/calculator', {
        method: 'POST',
        body: {
          subtotal,
          restaurantId: restaurant.id,
          distanceKm: checkoutDistanceKm(restaurant, address),
          couponCode: coupon || undefined,
          tip: tip > 0 ? tip : undefined,
          itemsAreCustomerPrices: true,
          items: cart.map((x) => ({ name: x.name, quantity: x.quantity, price: x.price })),
        },
      }),
    ])
      .then(([p, c]) => {
        if (cancelled) return
        setConfig(p.config)
        const nextBilling = c.breakdown?.customerBilling
        setBilling(nextBilling)

        if (couponApplyRequest.current === requestedCoupon) {
          couponApplyRequest.current = null
          setCouponApplying(false)
          if ((nextBilling?.couponDiscount || 0) > 0) {
            setCouponInput(requestedCoupon)
            showCouponToast(
              `${requestedCoupon} applied — you saved ${money(nextBilling.couponDiscount)}.`,
              'success'
            )
          } else {
            setCoupon('')
            showCouponToast(
              `${requestedCoupon} could not be applied. Check the code and minimum order.`,
              'error'
            )
          }
        }
      })
      .catch((quoteError) => {
        if (cancelled) return
        if (couponApplyRequest.current === requestedCoupon) {
          couponApplyRequest.current = null
          setCouponApplying(false)
          setCoupon('')
          showCouponToast('We could not verify that coupon. Please try again.', 'error')
        }
        setPricingError(
          quoteError instanceof Error ? quoteError.message : 'Could not calculate this order.'
        )
      })
    return () => {
      cancelled = true
    }
  }, [subtotal, restaurant, selected, addresses, coupon, tip, cart, showCouponToast])
  // Use the backend quote as the single payable amount everywhere. Rebuilding
  // it from visible rows would double-count GST when menu prices are tax-inclusive.
  const totalToPay = billing?.grandTotal ?? subtotal
  const foodSubtotal = billing?.customerFoodSubtotal || subtotal
  // The canonical engine splits GST into an embedded part (already inside menu prices) and a
  // platform-service part (18% on fees, charged on top). Present both so the bill reconciles.
  const taxSplit = billing?.taxSplit
  const freeDeliveryThreshold = config?.freeDeliveryThreshold ?? 0
  const freeDeliveryProgress = (() => {
    if (!freeDeliveryThreshold || freeDeliveryThreshold <= 0) return null
    if (billing?.isFreeDelivery) {
      return {
        pct: 100,
        label: 'Free delivery unlocked',
        detail: 'Enjoy free delivery on this order.',
      }
    }
    const pct = Math.min(100, Math.round((foodSubtotal / freeDeliveryThreshold) * 100))
    const remaining = Math.max(0, freeDeliveryThreshold - foodSubtotal)
    return {
      pct,
      label: `${money(remaining)} more for free delivery`,
      detail: `Add ${money(remaining)} to your order total to remove the delivery charge.`,
    }
  })()
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) {
      showCouponToast('Enter a coupon code first.', 'error')
      return
    }
    if (couponApplying) return
    if (coupon === code && (billing?.couponDiscount || 0) > 0) {
      showCouponToast(`${code} is already applied.`, 'success')
      return
    }
    couponApplyRequest.current = code
    setCouponApplying(true)
    setCoupon(code)
  }
  const removeCoupon = () => {
    const removedCoupon = coupon || couponInput.trim().toUpperCase()
    couponApplyRequest.current = null
    setCouponApplying(false)
    setCoupon('')
    setCouponInput('')
    if (removedCoupon) showCouponToast(`${removedCoupon} removed.`, 'success')
  }
  const pay = async (app: UpiPaymentApp) => {
    setError('')
    if (!config?.upiVpa) {
      setError('UPI payment is temporarily unavailable.')
      return
    }
    if (!billing) {
      setError('Please wait while CRAVE calculates the final total.')
      return
    }
    if (config.enableUpiDeepLink === false) {
      setError('UPI checkout is temporarily unavailable.')
      return
    }
    try {
      await openUpiPayment({
        vpa: config.upiVpa,
        merchant: config.merchantName || 'CRAVE',
        amount: Number(totalToPay),
        note: `CRAVE order from ${restaurant.name}`,
        app,
      })
      setPaymentPicker(false)
      setPaid(true)
    } catch (paymentError) {
      setError(
        paymentError instanceof Error ? paymentError.message : 'No UPI app could open this payment.'
      )
    }
  }
  const place = async () => {
    if (!selected) {
      setError('Add a delivery address first.')
      return
    }
    if (utr.trim().length < 10) {
      setError('Enter the UPI transaction reference after payment.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const idempotency = crypto.randomUUID()
      await apiRequest('/api/orders', {
        method: 'POST',
        body: {
          idempotency_key: idempotency,
          customer_name: user.name,
          customer_phone: user.phone,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          address_id: selected,
          items: cart.map((x) => ({
            id: x.itemId,
            menuItemId: x.itemId,
            variantId: x.variantId,
            quantity: x.quantity,
            qty: x.quantity,
            name: x.name,
            price: x.price,
          })),
          payment_method: 'UPI Online',
          utr_ref: utr.trim(),
          customer_vpa: user.email,
          coupon_code: coupon || undefined,
          tip,
        },
      })
      onPlaced()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place the order.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="checkout">
      <header>
        <button className="round pale" onClick={onClose}>
          <Icon name="back" />
        </button>
        <Logo compact />
        <span />
      </header>
      <main>
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1>Almost yours.</h1>
        <h2>Delivery address</h2>
        {addresses.length ? (
          <div className="address-list">
            {addresses.map((a) => (
              <button
                className={selected === a.id ? 'selected' : ''}
                onClick={() => setSelected(a.id)}
                key={a.id}
              >
                <Icon name="pin" />
                <span>
                  <b>{a.label}</b>
                  <small>{a.address}</small>
                </span>
                <i>{selected === a.id ? <Icon name="check" /> : null}</i>
              </button>
            ))}
          </div>
        ) : (
          <div className="error-box">Add a delivery address from Account before ordering.</div>
        )}
        {freeDeliveryProgress && (
          <div className="free-delivery-meter">
            <div className="meter-head">
              <span className="meter-icon">
                <Icon name="truck" />
              </span>
              <div className="meter-text">
                <b>{freeDeliveryProgress.label}</b>
                <small>{freeDeliveryProgress.detail}</small>
              </div>
            </div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${freeDeliveryProgress.pct}%` }} />
            </div>
          </div>
        )}
        <h2>Bill details</h2>
        <div className="bill-card">
          <span>
            Item total <b>{money(billing?.customerFoodSubtotal || subtotal)}</b>
          </span>
          <span>
            Packaging <b>{money(billing?.packagingFee || 0)}</b>
          </span>
          <span>
            Delivery <b>{billing?.isFreeDelivery ? 'FREE' : money(billing?.netDeliveryFee || 0)}</b>
          </span>
          <span>
            Platform & handling{' '}
            <b>{money((billing?.platformFee || 0) + (billing?.handlingFee || 0))}</b>
          </span>
          {taxSplit ? (
            <>
              {/* GST already baked into menu prices — informational, not added to the total */}
              <span className="included-row">
                Food &amp; packaging GST ({taxSplit}) · included in item prices
                <b>{money(billing?.foodPackagingGst || 0)}</b>
              </span>
              {/* 18% GST on platform/handling fees is a separate supply and IS charged */}
              {(billing?.platformServiceGst || 0) > 0 && (
                <span>
                  GST on platform &amp; handling (18%) <b>{money(billing.platformServiceGst)}</b>
                </span>
              )}
            </>
          ) : (
            <span>
              Taxes (included where applicable) <b>{money(billing?.gstAmount || 0)}</b>
            </span>
          )}
          {billing?.couponDiscount > 0 && (
            <span className="discount-row">
              Coupon discount <b>-{money(billing.couponDiscount)}</b>
            </span>
          )}
          {billing?.tip > 0 && (
            <span>
              Tip <b>{money(billing.tip)}</b>
            </span>
          )}
          <div>
            Total to pay <strong>{money(totalToPay)}</strong>
          </div>
        </div>
        {taxSplit && (
          <p className="bill-note">
            Your total adds up like this: item prices already include food &amp; packaging GST, so
            only the 18% tax on platform &amp; handling fees is charged on top. Menu price +
            packaging + delivery + platform &amp; handling + platform GST
            {billing?.couponDiscount > 0 ? ' − coupon' : ''}
            {billing?.tip > 0 ? ' + tip' : ''} = total.
          </p>
        )}
        <form
          className="coupon-row"
          onSubmit={(event) => {
            event.preventDefault()
            applyCoupon()
          }}
        >
          <div className="coupon-input">
            <Icon name="tag" />
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              inputMode="text"
              autoCapitalize="characters"
            />
            {couponInput && (
              <button
                type="button"
                className="round pale small"
                onClick={removeCoupon}
                aria-label={coupon ? 'Remove applied coupon' : 'Clear coupon code'}
              >
                <Icon name="close" />
              </button>
            )}
            <button className="coupon-apply" disabled={couponApplying}>
              {couponApplying ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </form>
        <div className="tip-row">
          <p className="tip-label">Add a tip for your delivery partner 🙏</p>
          <div className="tip-presets">
            {[0, 10, 20, 50].map((amt) => (
              <button
                key={amt}
                className={`tip-preset${tip === amt ? ' active' : ''}`}
                onClick={() => {
                  setTip(amt)
                  setTipInput(amt > 0 ? String(amt) : '')
                }}
              >
                {amt === 0 ? 'No tip' : `₹${amt}`}
              </button>
            ))}
          </div>
          <div className="coupon-input">
            <span className="tip-rupee">₹</span>
            <input
              className="tip-input"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="Custom amount"
              value={tipInput}
              onChange={(e) => {
                const val = e.target.value
                setTipInput(val)
                const num = Math.max(0, Number(val) || 0)
                setTip(num)
              }}
            />
          </div>
        </div>
        <h2>Pay securely with UPI</h2>
        <div className="upi-card">
          <Icon name="wallet" />
          <div>
            <b>UPI payment</b>
            <small>Google Pay, PhonePe, Paytm or any UPI app</small>
          </div>
          <strong>UPI</strong>
        </div>
        {pricingError && <div className="error-box">{pricingError}</div>}
        {!paid ? (
          <button
            className="primary wide"
            disabled={!billing || !config || !!pricingError}
            onClick={() => setPaymentPicker(true)}
          >
            {!billing && !pricingError ? (
              <>
                <Spinner /> Calculating final total
              </>
            ) : (
              `Pay ${money(totalToPay)} with UPI`
            )}
          </button>
        ) : (
          <div className="utr-box">
            <div className="success-line">
              <Icon name="check" />
              <span>
                <b>Complete payment in your UPI app</b>
                <small>Then return here and enter the transaction reference.</small>
              </span>
            </div>
            <label>
              UPI transaction reference (UTR)
              <input
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="Enter 12-digit UTR from your UPI app"
                maxLength={18}
              />
            </label>
            <button
              className="primary wide"
              disabled={busy || !addresses.length || utr.trim().length < 10}
              onClick={place}
            >
              {busy ? (
                <>
                  <Spinner /> Submitting
                </>
              ) : (
                'Submit payment for verification'
              )}
            </button>
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <p className="secure-note">
          Your order starts only after CRAVE verifies the UPI transaction.
        </p>
      </main>
      {couponToast && (
        <div
          className={`toast checkout-toast ${couponToast.type}`}
          role={couponToast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {couponToast.message}
        </div>
      )}
      {paymentPicker && (
        <div className="modal-backdrop" onClick={() => setPaymentPicker(false)}>
          <section
            className="bottom-sheet upi-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upi-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">PAY SECURELY</p>
                <h2 id="upi-picker-title">Choose your UPI app</h2>
              </div>
              <button className="round pale" onClick={() => setPaymentPicker(false)}>
                <Icon name="close" />
              </button>
            </div>
            <p className="upi-picker-total">
              Pay {money(totalToPay)} to {config?.merchantName || 'CRAVE'}
            </p>
            {error && <div className="error-box">{error}</div>}
            <div className="upi-app-grid">
              {(
                [
                  ['gpay', 'G', 'Google Pay'],
                  ['phonepe', 'पे', 'PhonePe'],
                  ['paytm', 'P', 'Paytm'],
                  ['other', 'UPI', 'Other app'],
                ] as [UpiPaymentApp, string, string][]
              ).map(([app, mark, label]) => (
                <button key={app} onClick={() => void pay(app)}>
                  <span className={`upi-app-mark ${app}`}>{mark}</span>
                  <b>{label}</b>
                  <small>
                    {app === 'other' ? 'Choose any installed UPI app' : `Open ${label}`}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function OrdersPage({
  orders,
  loading,
  error,
  onRefresh,
}: {
  orders: Order[]
  loading: boolean
  error: string
  onRefresh: () => void
}) {
  const active = orders.filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status)),
    past = orders.filter((o) => !active.includes(o))
  const card = (o: Order) => (
    <article className="order-card" key={o.id}>
      <div className="order-top">
        <div className="mini-logo">{o.restaurant_name?.[0] || 'C'}</div>
        <span>
          <h3>{o.restaurant_name || 'CRAVE order'}</h3>
          <p>
            #{o.id.slice(-8).toUpperCase()} ·{' '}
            {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Just now'}
          </p>
        </span>
        <b>{money(o.total_amount)}</b>
      </div>
      <div className={`status ${o.status}`}>
        <i />
        <span>
          <b>{titleCase(o.status)}</b>
          <small>
            {o.status === 'payment_submitted'
              ? 'UPI payment is awaiting admin verification'
              : o.status === 'payment_pending'
                ? 'Complete or resubmit payment'
                : o.status === 'delivered'
                  ? 'Delivered successfully'
                  : 'We’ll keep this updated live'}
          </small>
        </span>
      </div>
      {o.delivery_otp && (
        <div className="otp">
          Delivery OTP <strong>{o.delivery_otp}</strong>
        </div>
      )}
    </article>
  )
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LIVE TRACKING</p>
          <h1>Your orders</h1>
        </div>
        <button className="round pale" onClick={onRefresh}>
          <Icon name="refresh" />
        </button>
      </header>
      {loading ? (
        <div className="loading">
          <Spinner /> Syncing orders
        </div>
      ) : error ? (
        <div className="inline-retry">
          <div className="error-box">{error}</div>
          <button className="secondary" onClick={onRefresh}>
            Try again
          </button>
        </div>
      ) : !orders.length ? (
        <Empty
          icon="orders"
          title="No orders yet"
          text="Your first great meal is a few taps away."
        />
      ) : (
        <>
          <h2 className="section-title">
            Active <span>{active.length}</span>
          </h2>
          {active.length ? (
            active.map(card)
          ) : (
            <p className="muted">No active deliveries right now.</p>
          )}
          {past.length > 0 && (
            <>
              <h2 className="section-title spaced">Past orders</h2>
              {past.map(card)}
            </>
          )}
        </>
      )}
    </section>
  )
}

function Account({
  user,
  addresses,
  onAddresses,
  onLogout,
  theme,
  onTheme,
}: {
  user: User
  addresses: Address[]
  onAddresses: () => void
  onLogout: () => void
  theme: ThemeMode
  onTheme: (theme: ThemeMode) => void
}) {
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
  const [notifications, setNotifications] = useState(false),
    [checking, setChecking] = useState(false),
    [update, setUpdate] = useState<CustomerUpdate | null>(null),
    [message, setMessage] = useState('Tap to check for a newer version')
  useEffect(() => {
    notificationEnabled().then(setNotifications)
    void check()
  }, [])
  const check = async () => {
    setChecking(true)
    try {
      const u = await checkForCustomerUpdate()
      setUpdate(u)
      setMessage(u ? `CRAVE ${u.versionName} is ready` : 'You’re using the latest version')
      if (u) await notifyAppUpdate(`CRAVE ${u.versionName} available`, u.releaseNotes)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not check for updates')
    } finally {
      setChecking(false)
    }
  }
  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordFeedback(null)
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Enter your current password.' })
      return
    }
    if (currentPassword.length < 8 || currentPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your current password must be between 8 and 256 characters.',
      })
      return
    }
    if (!newPassword) {
      setPasswordFeedback({ type: 'error', message: 'Enter a new password.' })
      return
    }
    if (newPassword.length < 8 || newPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your new password must be between 8 and 256 characters.',
      })
      return
    }
    if (!confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Confirm your new password.' })
      return
    }
    if (confirmPassword.length < 8 || confirmPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your confirmed password must be between 8 and 256 characters.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your new password must be different from your current password.',
      })
      return
    }
    setChangingPassword(true)
    try {
      const response = await apiRequest<{ success?: boolean; message?: string }>(
        '/api/user/change-password',
        {
          method: 'POST',
          body: { currentPassword, newPassword, confirmPassword },
        }
      )
      setPasswordFeedback({
        type: 'success',
        message: response.message || 'Password changed successfully.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (passwordError) {
      setPasswordFeedback({
        type: 'error',
        message:
          passwordError instanceof Error
            ? passwordError.message
            : 'Could not change your password.',
      })
    } finally {
      setChangingPassword(false)
    }
  }
  return (
    <section className="page account">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR CRAVE</p>
          <h1>Account</h1>
        </div>
        <div className="avatar">{user.name?.[0]?.toUpperCase() || 'C'}</div>
      </header>
      <div className="profile-card">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        {user.phone && <small>{user.phone}</small>}
      </div>
      <h2 className="section-title">Preferences</h2>
      <div className="settings-list">
        <div>
          <span className="setting-icon">
            <Icon name="bell" />
          </span>
          <span>
            <b>Order notifications</b>
            <small>Payment, kitchen and delivery alerts</small>
          </span>
          <Toggle
            checked={notifications}
            onChange={async (v) => setNotifications(await enableNotifications(v))}
          />
        </div>
        <button onClick={onAddresses}>
          <span className="setting-icon">
            <Icon name="pin" />
          </span>
          <span>
            <b>Saved addresses</b>
            <small>
              {addresses.length} delivery {addresses.length === 1 ? 'address' : 'addresses'}
            </small>
          </span>
          <Icon name="chevron" />
        </button>
      </div>
      <h2 className="section-title">Security</h2>
      <form className="password-form" onSubmit={changePassword} noValidate>
        <div className="password-card">
          <div className="password-card-header">
            <p className="eyebrow">ACCOUNT SECURITY</p>
            <h3>Change password</h3>
            <p>Choose a password you do not use anywhere else.</p>
          </div>
          <div className="password-fields">
            <label>
              Current password
              <div className="password">
                <input
                  required
                  minLength={8}
                  maxLength={256}
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value)
                    setPasswordFeedback(null)
                  }}
                  autoComplete="current-password"
                  placeholder="Current password"
                />
                <button
                  type="button"
                  aria-label={
                    showCurrentPassword ? 'Hide current password' : 'Show current password'
                  }
                  aria-pressed={showCurrentPassword}
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label>
              New password
              <div className="password">
                <input
                  required
                  minLength={8}
                  maxLength={256}
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setPasswordFeedback(null)
                  }}
                  autoComplete="new-password"
                  placeholder="8–256 characters"
                />
                <button
                  type="button"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showNewPassword}
                  onClick={() => setShowNewPassword((visible) => !visible)}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <label>
              Confirm new password
              <div className="password">
                <input
                  required
                  minLength={8}
                  maxLength={256}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setPasswordFeedback(null)
                  }}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'
                  }
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          </div>
          <p className="password-guidance">New passwords must be 8–256 characters long.</p>
          {passwordFeedback && (
            <div
              className={passwordFeedback.type === 'success' ? 'success-box' : 'error-box'}
              role={passwordFeedback.type === 'success' ? 'status' : 'alert'}
              aria-live="polite"
            >
              {passwordFeedback.message}
            </div>
          )}
          <button className="primary wide" type="submit" disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Spinner /> Updating password
              </>
            ) : (
              'Change password'
            )}
          </button>
        </div>
      </form>
      <h2 className="section-title">Appearance</h2>
      <div className="theme-control" role="group" aria-label="App theme">
        {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
          <button
            key={mode}
            className={theme === mode ? 'active' : ''}
            onClick={() => onTheme(mode)}
          >
            {titleCase(mode)}
          </button>
        ))}
      </div>
      <h2 className="section-title">App</h2>
      <div className="settings-list">
        <button
          onClick={
            update ? () => installCustomerUpdate(update).catch((e) => setMessage(e.message)) : check
          }
          disabled={checking}
        >
          <span className="setting-icon">
            <Icon name={update ? 'download' : 'refresh'} />
          </span>
          <span>
            <b>{update ? 'Update CRAVE now' : 'Check for updates'}</b>
            <small>{checking ? 'Checking…' : message}</small>
          </span>
          {checking ? <Spinner /> : <Icon name="chevron" />}
        </button>
      </div>
      <button className="logout-button" onClick={() => setConfirmLogout(true)}>
        <Icon name="logout" /> Sign out
      </button>
      {confirmLogout && (
        <div
          className="modal-backdrop animated-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-logout-title"
          onClick={() => setConfirmLogout(false)}
        >
          <section
            className="bottom-sheet animated-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">Confirm sign out</p>
                <h2 id="customer-logout-title">Really sign out?</h2>
              </div>
              <button
                className="round pale"
                onClick={() => setConfirmLogout(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="upi-picker-total">
              You will be signed out of the CRAVE app. You can sign back in anytime.
            </p>
            <div className="upi-app-grid">
              <button className="upi-app-card" onClick={() => setConfirmLogout(false)}>
                <span className="upi-app-mark gpay">
                  <Icon name="close" />
                </span>
                <b>Cancel</b>
                <small>Stay signed in</small>
              </button>
              <button className="upi-app-card" onClick={onLogout}>
                <span className="upi-app-mark phonepe">
                  <Icon name="logout" />
                </span>
                <b>Sign out</b>
                <small>Leave the app</small>
              </button>
            </div>
          </section>
        </div>
      )}
      <p className="version">CRAVE. Customer · 1.0.0</p>
    </section>
  )
}

function Addresses({
  items,
  onClose,
  onChanged,
}: {
  items: Address[]
  onClose: () => void
  onChanged: () => void
}) {
  const [adding, setAdding] = useState(false),
    [form, setForm] = useState({ label: 'Home', address: '' }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [location, setLocation] = useState<AddressMapPoint | null>(null),
    [suggestions, setSuggestions] = useState<
      Array<{
        placeId: string
        formattedAddress: string
        secondaryAddress: string
        lat: number
        lng: number
      }>
    >([]),
    [searching, setSearching] = useState(false),
    [locating, setLocating] = useState(false),
    [mapBusy, setMapBusy] = useState(false)
  useEffect(() => {
    if (!adding || form.address.trim().length < 3 || location) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await apiRequest<{ results: typeof suggestions }>(
          `/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`
        )
        setSuggestions(response.results || [])
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [adding, form.address, location])
  const chooseMapLocation = async (point: AddressMapPoint) => {
    setLocation(point)
    setSuggestions([])
    setMapBusy(true)
    setError('')
    try {
      const response = await apiRequest<{ formattedAddress: string }>(
        `/api/geocode/reverse?lat=${point.lat}&lng=${point.lng}`
      )
      setForm((current) => ({ ...current, address: response.formattedAddress }))
    } catch (mapError) {
      setError(mapError instanceof Error ? mapError.message : 'Could not identify this location.')
    } finally {
      setMapBusy(false)
    }
  }
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not available on this device.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        void chooseMapLocation({ lat: coords.latitude, lng: coords.longitude })
      },
      (locationError) => {
        setLocating(false)
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? 'Allow location access to use your current position.'
            : 'Could not get your current location. Try selecting the pin on the map.'
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      let resolvedLocation = location
      if (!resolvedLocation) {
        const geocode = await apiRequest<{
          results: Array<{ formattedAddress: string; lat: number; lng: number }>
        }>(`/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`)
        const match = geocode.results?.[0]
        if (!match) throw new Error('Choose a complete address so CRAVE can calculate delivery.')
        resolvedLocation = { lat: match.lat, lng: match.lng }
      }
      await apiRequest('/api/user/addresses', {
        method: 'POST',
        body: {
          ...form,
          latitude: resolvedLocation.lat,
          longitude: resolvedLocation.lng,
          is_default: !items.length,
        },
      })
      setAdding(false)
      setForm({ label: 'Home', address: '' })
      setLocation(null)
      setSuggestions([])
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save address')
    } finally {
      setBusy(false)
    }
  }
  const setDefault = async (id: string) => {
    await apiRequest('/api/user/addresses', { method: 'PUT', body: { id, action: 'set_default' } })
    onChanged()
  }
  return (
    <div className="subpage">
      <header>
        <button className="round pale" onClick={onClose}>
          <Icon name="back" />
        </button>
        <h1>Saved addresses</h1>
        <button className="round lime" onClick={() => setAdding(true)}>
          <Icon name="plus" />
        </button>
      </header>
      <main>
        {items.map((a) => (
          <article className="saved-address" key={a.id}>
            <Icon name="pin" />
            <span>
              <h3>{a.label}</h3>
              <p>{a.address}</p>
            </span>
            {a.is_default ? (
              <b>DEFAULT</b>
            ) : (
              <button onClick={() => setDefault(a.id)}>Set default</button>
            )}
          </article>
        ))}
        {!items.length && !adding && (
          <Empty
            icon="search"
            title="No address saved"
            text="Add a delivery address to place an order."
          />
        )}
        {adding && (
          <div className="address-form">
            <p className="eyebrow">NEW ADDRESS</p>
            <label>
              Label
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Home, Work…"
              />
            </label>
            <label>
              Full address
              <textarea
                value={form.address}
                onChange={(e) => {
                  setLocation(null)
                  setForm({ ...form, address: e.target.value })
                }}
                placeholder="House, street, landmark and city"
              />
            </label>
            {searching && (
              <p className="address-searching">
                <Spinner /> Finding addresses…
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => {
                      setForm({ ...form, address: suggestion.formattedAddress })
                      setLocation({ lat: suggestion.lat, lng: suggestion.lng })
                      setSuggestions([])
                    }}
                  >
                    <Icon name="pin" />
                    <span>
                      <b>{suggestion.formattedAddress.split(',')[0]}</b>
                      <small>{suggestion.secondaryAddress}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="partner-map-wrap">
              <div className="partner-map-head">
                <span>Delivery location</span>
                <small>Tap the map to drop the pin or use your current location.</small>
              </div>
              <Suspense
                fallback={<div className="address-map-canvas map-loading">Loading map…</div>}
              >
                <AddressMap location={location} onPick={(point) => void chooseMapLocation(point)} />
              </Suspense>
              <div className="address-map-toolbar">
                <span>
                  <b>{mapBusy ? 'Finding this address…' : 'Pin your delivery entrance'}</b>
                  <small>Tap the map for a precise location.</small>
                </span>
                <button type="button" onClick={useCurrentLocation} disabled={locating || mapBusy}>
                  {locating ? <Spinner /> : <Icon name="pin" />}
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>
            </div>
            {location && (
              <p className="address-confirmed">
                <Icon name="check" /> Location confirmed
              </p>
            )}
            {error && <div className="error-box">{error}</div>}
            <div>
              <button className="secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy || !form.address.trim()} onClick={save}>
                {busy ? <Spinner /> : 'Save address'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [tab, setTab] = useState<Tab>('home'),
    [restaurants, setRestaurants] = useState<Restaurant[]>([]),
    [selected, setSelected] = useState<Restaurant | null>(null),
    [cartRestaurant, setCartRestaurant] = useState<Restaurant | null>(() => {
      try {
        return JSON.parse(localStorage.getItem('crave_cart_restaurant') || 'null')
      } catch {
        return null
      }
    }),
    [cart, setCart] = useState<CartItem[]>(() => {
      try {
        return JSON.parse(localStorage.getItem('crave_cart') || '[]')
      } catch {
        return []
      }
    }),
    [orders, setOrders] = useState<Order[]>([]),
    [ordersLoading, setOrdersLoading] = useState(false),
    [ordersError, setOrdersError] = useState(''),
    [catalogError, setCatalogError] = useState(''),
    [online, setOnline] = useState(true),
    [addresses, setAddresses] = useState<Address[]>([]),
    [checkout, setCheckout] = useState(false),
    [addressPage, setAddressPage] = useState(false),
    [search, setSearch] = useState(''),
    [favourites, setFavourites] = useState<string[]>(() => {
      try {
        return JSON.parse(localStorage.getItem('crave_favourites') || '[]')
      } catch {
        return []
      }
    }),
    [toast, setToast] = useState('')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const previous = useRef<Record<string, string>>({})
  const showToast = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(''), 2200)
  }
  const loadRestaurants = useCallback(async () => {
    setCatalogError('')
    try {
      const response = await apiRequest<{ restaurants: Restaurant[] }>('/api/restaurants')
      setRestaurants((response.restaurants || []).filter((restaurant) => !restaurant.is_dark_store))
    } catch (catalogFailure) {
      setCatalogError(
        catalogFailure instanceof Error ? catalogFailure.message : 'Could not load restaurants.'
      )
    }
  }, [])
  const loadAddresses = useCallback(
    () =>
      apiRequest<{ addresses: Address[] }>('/api/user/addresses')
        .then((r) => setAddresses(r.addresses || []))
        .catch(() => setAddresses([])),
    []
  )
  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setOrdersLoading(true)
    setOrdersError('')
    try {
      const r = await apiRequest<{ orders: Order[] }>('/api/orders')
      const next = r.orders || []
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
  useEffect(() => {
    void initializeNative()
    void loadTheme().then(setTheme)
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
    const timer = window.setInterval(() => void loadOrders(true), 15000)
    return () => clearInterval(timer)
  }, [user, loadRestaurants, loadAddresses, loadOrders])
  useEffect(() => {
    if (!user || getAuthToken() === COOKIE_SESSION_TOKEN) return
    const activeIds = orders
      .filter((o) => !['delivered', 'completed', 'cancelled'].includes(o.status))
      .map((o) => o.id)
    return connectCustomerOrders(activeIds, () => void loadOrders(true))
  }, [user, orders.map((o) => `${o.id}:${o.status}`).join('|'), loadOrders])
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
    localStorage.setItem('crave_favourites', JSON.stringify(favourites))
  }, [favourites])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let listener: { remove: () => Promise<void> } | undefined
    void CapacitorApp.addListener('backButton', () => {
      if (addressPage) setAddressPage(false)
      else if (checkout) setCheckout(false)
      else if (selected) setSelected(null)
      else if (tab !== 'home') setTab('home')
      else void CapacitorApp.minimizeApp()
    }).then((handle) => {
      listener = handle
    })
    return () => void listener?.remove()
  }, [addressPage, checkout, selected, tab])
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
    if (!confirmLogout) return
    setConfirmLogout(false)
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
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
      <div className="splash">
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
        onPlaced={() => {
          setCheckout(false)
          setCart([])
          setTab('orders')
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
              setTab('cart')
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
  const visible = restaurants.filter((r) =>
    `${r.name} ${r.cuisine || ''}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner">You’re offline. We’ll reconnect automatically.</div>
      )}
      <main className="content">
        {tab === 'home' && (
          <section className="page home">
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
              <p>Hey, {user.name.split(' ')[0]} 👋</p>
              <h1>
                Good food.
                <br />
                <em>No waiting.</em>
              </h1>
            </div>
            <button className="search-launch" onClick={() => setTab('search')}>
              <Icon name="search" />
              Search dishes, cuisines or restaurants
            </button>
            <div className="promo">
              <div>
                <span>FIRST BITE</span>
                <h2>Tonight’s sorted.</h2>
                <p>Local favourites, delivered fresh.</p>
                <button onClick={() => setTab('search')}>
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
              <button onClick={() => setTab('search')}>See all</button>
            </div>
            <div className="restaurant-list">
              {restaurants.slice(0, 6).map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onOpen={() => setSelected(r)}
                  favourite={favourites.includes(r.id)}
                  onFavourite={() =>
                    setFavourites((f) =>
                      f.includes(r.id) ? f.filter((x) => x !== r.id) : [...f, r.id]
                    )
                  }
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
          </section>
        )}
        {tab === 'search' && (
          <section className="page">
            <header className="page-header">
              <div>
                <p className="eyebrow">DISCOVER</p>
                <h1>Find your food</h1>
              </div>
            </header>
            <div className="search-field sticky-search">
              <Icon name="search" />
              <input
                autoFocus
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
              {search ? `Results for “${search}”` : 'All restaurants'} <span>{visible.length}</span>
            </h2>
            <div className="restaurant-list">
              {visible.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  onOpen={() => setSelected(r)}
                  favourite={favourites.includes(r.id)}
                  onFavourite={() =>
                    setFavourites((f) =>
                      f.includes(r.id) ? f.filter((x) => x !== r.id) : [...f, r.id]
                    )
                  }
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
          </section>
        )}
        {tab === 'orders' && (
          <OrdersPage
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRefresh={() => loadOrders()}
          />
        )}{' '}
        {tab === 'cart' && (
          <CartPage
            cart={cart}
            restaurant={cartRestaurant || undefined}
            onQuantity={quantity}
            onBrowse={() => setTab('home')}
            onCheckout={() => setCheckout(true)}
          />
        )}{' '}
        {tab === 'account' && (
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
          />
        )}
      </main>
      <nav className="bottom-nav">
        {(
          [
            ['home', 'Home'],
            ['orders', 'Orders'],
            ['cart', 'Bag'],
            ['account', 'You'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => {
              setTab(id)
              void tap()
            }}
          >
            <span>
              <Icon name={id === 'account' ? 'user' : id} />
              {id === 'cart' && cart.length > 0 ? (
                <i>{cart.reduce((n, x) => n + x.quantity, 0)}</i>
              ) : null}
            </span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
