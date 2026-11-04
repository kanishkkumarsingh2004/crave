import { useState, useEffect, useMemo } from 'react'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { PullToRefresh } from '../../components/PullToRefresh'
import { Empty } from '../../components/common/Empty'
import { Spinner } from '../../components/common/Spinner'
import { checkoutDistanceKm } from '../../pricing'
import { money } from '@crave/mobile-core'
import type { CartItem, Restaurant, Address } from '../../types'

interface CartPageProps {
  cart: CartItem[]
  restaurant?: Restaurant
  addresses: Address[]
  onQuantity: (k: string, d: number) => void
  onBrowse: () => void
  onAddresses: () => void
  onCheckout: () => void
  onRefresh: () => void
  refreshing: boolean
}

export function CartPage({
  cart,
  restaurant,
  addresses,
  onQuantity,
  onBrowse,
  onAddresses,
  onCheckout,
  onRefresh,
  refreshing,
}: CartPageProps) {
  const subtotal = cart.reduce((n, x) => n + x.price * x.quantity, 0)
  const selectedAddress = addresses.find((entry) => entry.is_default) || addresses[0]
  const [billing, setBilling] = useState<any>(null)

  useEffect(() => {
    if (!restaurant || cart.length === 0) {
      setBilling(null)
      return
    }
    let cancelled = false
    setBilling(null)
    apiRequest<any>('/api/calculator', {
      method: 'POST',
      body: {
        subtotal,
        restaurantId: restaurant.id,
        distanceKm: checkoutDistanceKm(restaurant, selectedAddress),
        itemsAreCustomerPrices: true,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    })
      .then((response) => {
        if (!cancelled) setBilling(response.breakdown?.customerBilling || null)
      })
      .catch(() => {
        if (!cancelled) setBilling(null)
      })
    return () => {
      cancelled = true
    }
  }, [cart, restaurant, selectedAddress, subtotal])

  const totalToPay = billing?.grandTotal ?? subtotal

  return (
    <section className="page bag-review-page">
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
        <header className="bag-review-header">
          <button className="round pale" onClick={onBrowse} aria-label="Back to restaurants">
            <Icon name="back" />
          </button>
          <h1>Order review</h1>
          <span aria-hidden="true" />
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
          <div className="cart-scroll-content bag-review-content">
            <section className="bag-review-section">
              <div className="bag-review-section-head">
                <h2>Delivery address</h2>
                <button onClick={onAddresses}>{selectedAddress ? 'Edit' : 'Add'}</button>
              </div>
              {selectedAddress ? (
                <button className="bag-address" onClick={onAddresses}>
                  <span className="bag-address-icon">
                    <Icon name="pin" />
                  </span>
                  <span>
                    <b>
                      {selectedAddress.label}
                      {selectedAddress.is_default && <small>Primary</small>}
                    </b>
                    <em>{selectedAddress.address}</em>
                  </span>
                </button>
              ) : (
                <button className="bag-address bag-address-empty" onClick={onAddresses}>
                  <span className="bag-address-icon">
                    <Icon name="pin" />
                  </span>
                  <span>
                    <b>Add a delivery address</b>
                    <em>An address is required before placing your order.</em>
                  </span>
                </button>
              )}
              <div className="bag-eta">
                <span>
                  <Icon name="clock" />
                </span>
                <div>
                  <small>Estimated time</small>
                  <b>{restaurant?.eta || '25–35 min'}</b>
                </div>
              </div>
            </section>

            <section className="bag-review-section">
              <div className="bag-review-section-head">
                <h2>Your selection</h2>
                <button onClick={onBrowse}>Add items</button>
              </div>
              <div className="bag-review-items">
                {cart.map((x) => (
                  <article key={x.key}>
                    <div className="bag-item-image">
                      {x.image ? (
                        <img src={x.image} alt={`${x.name} dish`} />
                      ) : (
                        <span>{x.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="bag-item-copy">
                      <h3>{x.name}</h3>
                      <p>{x.variant || 'Freshly prepared'}</p>
                      <div className="stepper">
                        <button
                          onClick={() => onQuantity(x.key, -1)}
                          aria-label={`Remove one ${x.name}`}
                        >
                          <Icon name="minus" />
                        </button>
                        <b>{x.quantity}</b>
                        <button
                          onClick={() => onQuantity(x.key, 1)}
                          aria-label={`Add one ${x.name}`}
                        >
                          <Icon name="plus" />
                        </button>
                      </div>
                    </div>
                    <div className="bag-item-price">
                      <strong>{money(x.price * x.quantity)}</strong>
                      <button onClick={() => onQuantity(x.key, -x.quantity)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </PullToRefresh>
      {cart.length > 0 && (
        <div className="bag-review-bar">
          <button className="bag-place-order" disabled={!selectedAddress} onClick={onCheckout}>
            <span>Place order</span>
            <strong>{money(totalToPay)}</strong>
          </button>
          <small>Final order details are confirmed on the next step.</small>
        </div>
      )}
    </section>
  )
}