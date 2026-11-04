import { useState, useEffect, useCallback, useRef, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { AccessibleDialog } from '@crave/mobile-core'
import { Logo } from '../../components/common/Logo'
import { Spinner } from '../../components/common/Spinner'
import { checkoutDistanceKm } from '../../pricing'
import { money, label as titleCase, shortId } from '@crave/mobile-core'
import { startRazorpayCheckout } from '../../razorpay'
import type { CartItem, Restaurant, User, Address } from '../../types'

interface CheckoutProps {
  cart: CartItem[]
  restaurant: Restaurant
  user: User
  addresses: Address[]
  onClose: () => void
  onPlaced: () => void
  onManageAddresses?: () => void
}

export function Checkout({
  cart,
  restaurant,
  user,
  addresses,
  onClose,
  onPlaced,
  onManageAddresses,
}: CheckoutProps) {
  const subtotal = cart.reduce((n, x) => n + x.price * x.quantity, 0)
  const [selected, setSelected] = useState(
    addresses.find((x) => x.is_default)?.id || addresses[0]?.id || ''
  )
  const [coupon, setCoupon] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponApplying, setCouponApplying] = useState(false)
  const [couponToast, setCouponToast] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  )
  const [tip, setTip] = useState(0)
  const [tipInput, setTipInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [tipSheet, setTipSheet] = useState(false)
  const [addressSheet, setAddressSheet] = useState(false)
  const [error, setError] = useState('')
  const [billing, setBilling] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [pricingError, setPricingError] = useState('')
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

  const totalToPay = billing?.grandTotal ?? subtotal
  const foodSubtotal = billing?.customerFoodSubtotal || subtotal
  const selectedAddress = addresses.find((entry) => entry.id === selected)
  const taxSplit = billing?.taxSplit
  const totalTax = taxSplit
    ? Number(billing?.foodPackagingGst || 0) + Number(billing?.platformServiceGst || 0)
    : Number(billing?.gstAmount || 0)
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

  return (
    <div className="checkout">
      <header>
        <button className="round pale" onClick={onClose}>
          <Icon name="back" />
        </button>
        <Logo compact />
      </header>
      <main>
        <p className="eyebrow">SECURE CHECKOUT</p>
        <h1>Almost yours.</h1>
        <div className="checkout-section-head">
          <h2>Delivery address</h2>
          {addresses.length > 0 && (
            <button className="text-link" onClick={() => setAddressSheet(true)}>
              Change
            </button>
          )}
        </div>
        {addresses.length ? (
          <div className="address-list">
            {selectedAddress && (
              <button className="selected" onClick={() => setAddressSheet(true)}>
                <Icon name="pin" />
                <span>
                  <b>{selectedAddress.label}</b>
                  <small>{selectedAddress.address}</small>
                </span>
                <i>
                  <Icon name="check" />
                </i>
              </button>
            )}
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
            <div className="bill-taxes">
              <span>
                GST & Other Charges <b>{money(totalTax)}</b>
              </span>
              <small>
                {money(billing?.foodPackagingGst || 0)} already included in the item prices ·{' '}
                {money(billing?.platformServiceGst || 0)} on platform & handling
              </small>
            </div>
          ) : (
            <span>
              GST & Other Charges <b>{money(billing?.gstAmount || 0)}</b>
            </span>
          )}
          {billing?.couponDiscount > 0 && (
            <span className="discount-row">
              Coupon discount <b>-{money(billing.couponDiscount)}</b>
            </span>
          )}
          <span className="bill-tip-row">
            Delivery Tip{' '}
            <button className="bill-tip-action" onClick={() => setTipSheet(true)}>
              {billing?.tip > 0 ? `Edit · ${money(billing.tip)}` : 'Add tip'}
            </button>
          </span>
          <div>
            Total to pay <strong>{money(totalToPay)}</strong>
          </div>
        </div>
        {pricingError && <div className="error-box">{pricingError}</div>}
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
        {taxSplit && (
          <p className="bill-note">
            Your total adds up like this: item prices already include food & packaging GST, so
            only the 18% tax on platform & handling fees is charged on top. Menu price +
            packaging + delivery + platform & handling + platform GST
            {billing?.couponDiscount > 0 ? ' − coupon' : ''}
            {billing?.tip > 0 ? ' + tip' : ''} = total.
          </p>
        )}
        <div className="pay-bar">
          <button
            className="pay-bar-btn pay-bar-btn-razorpay"
            disabled={!billing || !config || !!pricingError || busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                const idempotency = crypto.randomUUID()
                const created = await apiRequest<any>('/api/orders', {
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
                    payment_method: 'RAZORPAY',
                    coupon_code: coupon || undefined,
                    tip,
                  },
                })
                const orderId = created?.orderId || created?.id
                if (!orderId) throw new Error('No order ID returned from server')
                await startRazorpayCheckout({
                  orderId,
                  apiRequest: (path, options) => apiRequest(path, options),
                })
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Razorpay checkout failed.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? (
              <>
                <Spinner /> Processing
              </>
            ) : (
              `Pay ${money(totalToPay)} via Razorpay`
            )}
          </button>
        </div>
        {error && <div className="error-box">{error}</div>}
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
      {addressSheet && (
        <AccessibleDialog
          className="bottom-sheet address-sheet"
          labelledBy="address-sheet-title"
          onClose={() => setAddressSheet(false)}
        >
          <div className="sheet-handle" />
          <div className="sheet-title">
            <div>
              <p className="eyebrow">DELIVERY</p>
              <h2 id="address-sheet-title">Change address</h2>
            </div>
            <button
              className="round pale"
              onClick={() => setAddressSheet(false)}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="address-list">
            {addresses.map((a) => (
              <button
                className={selected === a.id ? 'selected' : ''}
                onClick={() => {
                  setSelected(a.id)
                  setAddressSheet(false)
                }}
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
          {onManageAddresses && (
            <button
              className="secondary wide address-add"
              onClick={() => {
                setAddressSheet(false)
                onManageAddresses()
              }}
            >
              <Icon name="plus" />
              Add a new address
            </button>
          )}
        </AccessibleDialog>
      )}

      {tipSheet && (
        <AccessibleDialog
          className="bottom-sheet tip-sheet"
          labelledBy="tip-sheet-title"
          onClose={() => setTipSheet(false)}
        >
          <div className="sheet-handle" />
          <div className="sheet-title">
            <div>
              <p className="eyebrow">DELIVERY PARTNER</p>
              <h2 id="tip-sheet-title">Add a tip</h2>
            </div>
            <button className="round pale" onClick={() => setTipSheet(false)} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>

          <div className="tip-bill">
            <span className="tip-bill-rule" />
            {[
              [0, 'No tip'],
              [10, 'Small tip'],
              [20, 'Medium tip'],
              [50, 'Large tip'],
            ].map(([amount, label]) => (
              <button
                key={String(amount)}
                className={tip === amount ? 'active' : ''}
                onClick={() => {
                  setTip(amount as number)
                  setTipInput(amount ? String(amount) : '')
                }}
              >
                <span>{label}</span>
                <b>{amount ? `₹${amount}` : '₹0'}</b>
              </button>
            ))}
            <span className="tip-bill-rule" />
            <label className="tip-bill-custom">
              <span>Custom amount</span>
              <span className="coupon-input">
                <span className="tip-rupee">₹</span>
                <input
                  className="tip-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={tipInput}
                  onChange={(e) => {
                    const val = e.target.value
                    setTipInput(val)
                    setTip(Math.max(0, Number(val) || 0))
                  }}
                />
              </span>
            </label>
            <span className="tip-bill-rule" />
            <span className="tip-bill-total">
              <span>Tip added</span>
              <b>{money(tip)}</b>
            </span>
          </div>

          <button className="primary wide" onClick={() => setTipSheet(false)}>
            Save tip
          </button>
        </AccessibleDialog>
      )}
    </div>
  )
}