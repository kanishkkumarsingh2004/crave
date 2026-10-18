import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Network } from '@capacitor/network'
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
  notifyOrder,
  tap,
} from './native'
import { checkForCustomerUpdate, installCustomerUpdate, type CustomerUpdate } from './update'
import { connectCustomerOrders } from './realtime'
import { openUpiPayment } from './payment'
import { checkoutDistanceKm } from './pricing'
import type { Address, CartItem, MenuItem, Order, Restaurant, User, Variant } from './types'

type Tab = 'home' | 'search' | 'orders' | 'cart' | 'account'
const money = (value: number) => `₹${Math.round(Number(value) || 0)}`
const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const FALLBACK = ['#f4ff52', '#ffb86b', '#b8d8ff', '#e6cbff', '#a9efcf']

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
        className="restaurant-image"
        style={{
          background: restaurant.image
            ? `linear-gradient(0deg,rgba(0,0,0,.38),transparent),url(${restaurant.image}) center/cover`
            : FALLBACK[restaurant.name.length % FALLBACK.length],
        }}
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
            ? `linear-gradient(0deg,rgba(5,12,8,.88),rgba(5,12,8,.08)),url(${restaurant.image}) center/cover`
            : '#14231a',
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
                    <div
                      className="dish-image"
                      style={{
                        background:
                          item.image || item.image_url
                            ? `url(${item.image || item.image_url}) center/cover`
                            : '#e8ebdf',
                      }}
                    >
                      {!(item.image || item.image_url) && '🍽️'}
                    </div>
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
      {pick && (
        <div className="modal-backdrop" onClick={() => setPick(null)}>
          <section className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
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
        </div>
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
    [busy, setBusy] = useState(false),
    [paid, setPaid] = useState(false),
    [error, setError] = useState(''),
    [billing, setBilling] = useState<any>(null),
    [config, setConfig] = useState<any>(null),
    [pricingError, setPricingError] = useState('')
  useEffect(() => {
    const address = addresses.find((entry) => entry.id === selected)
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
          itemsAreCustomerPrices: true,
          items: cart.map((x) => ({ name: x.name, quantity: x.quantity, price: x.price })),
        },
      }),
    ])
      .then(([p, c]) => {
        setConfig(p.config)
        setBilling(c.breakdown?.customerBilling)
      })
      .catch((quoteError) =>
        setPricingError(
          quoteError instanceof Error ? quoteError.message : 'Could not calculate this order.'
        )
      )
  }, [subtotal, restaurant, selected, addresses, coupon, cart])
  const total = billing?.grandTotal || subtotal
  const pay = async () => {
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
        amount: Number(total),
        note: `CRAVE order from ${restaurant.name}`,
      })
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
          <span>
            Taxes <b>{money(billing?.gstAmount || 0)}</b>
          </span>
          <div>
            Total to pay <strong>{money(total)}</strong>
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
            onClick={pay}
          >
            {!billing && !pricingError ? (
              <>
                <Spinner /> Calculating final total
              </>
            ) : (
              `Pay ${money(total)} with UPI`
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
}: {
  user: User
  addresses: Address[]
  onAddresses: () => void
  onLogout: () => void
}) {
  const [notifications, setNotifications] = useState(false),
    [checking, setChecking] = useState(false),
    [update, setUpdate] = useState<CustomerUpdate | null>(null),
    [message, setMessage] = useState('Tap to check for a newer version')
  useEffect(() => {
    notificationEnabled().then(setNotifications)
  }, [])
  const check = async () => {
    setChecking(true)
    try {
      const u = await checkForCustomerUpdate()
      setUpdate(u)
      setMessage(u ? `CRAVE ${u.versionName} is ready` : 'You’re using the latest version')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not check for updates')
    } finally {
      setChecking(false)
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
      <button className="logout-button" onClick={onLogout}>
        <Icon name="logout" /> Sign out
      </button>
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
    [location, setLocation] = useState<{ lat: number; lng: number } | null>(null),
    [suggestions, setSuggestions] = useState<
      Array<{
        placeId: string
        formattedAddress: string
        secondaryAddress: string
        lat: number
        lng: number
      }>
    >([]),
    [searching, setSearching] = useState(false)
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
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    await clearAuthToken()
    setUser(null)
    setCart([])
    setCartRestaurant(null)
    setOrders([])
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
            <div className="cuisine-row">
              {['All', 'Momos', 'Indian', 'Chinese', 'Pizza', 'Biryani'].map((c) => (
                <button
                  key={c}
                  className={
                    (c === 'All' && !search) || search.toLowerCase() === c.toLowerCase()
                      ? 'active'
                      : ''
                  }
                  onClick={() => setSearch(c === 'All' ? '' : c)}
                >
                  {c}
                </button>
              ))}
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
          />
        )}
      </main>
      <nav className="bottom-nav">
        {(
          [
            ['home', 'Home'],
            ['search', 'Search'],
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
