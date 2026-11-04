import { useState, useCallback } from 'react'
import { startRazorpayCheckout } from '../../razorpay'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { PullToRefresh } from '../../components/PullToRefresh'
import { Spinner } from '../../components/common/Spinner'
import { Empty } from '../../components/common/Empty'
import { money, label as titleCase, shortId } from '@crave/mobile-core'
import { useLanguage } from '../../../../dictionary/react'
import type { Order, User } from '../../types'

const CLOSED_ORDER_STATUSES = ['delivered', 'completed', 'cancelled']
const INVOICED_ORDER_STATUSES = ['delivered', 'completed']
const showDeliveryCode = (o: Order) =>
  Boolean(o.delivery_otp) && !CLOSED_ORDER_STATUSES.includes(o.status)

interface OrdersPageProps {
  orders: Order[]
  loading: boolean
  error: string
  onRefresh: () => void
  refreshing: boolean
  customer?: User | null
}

export function OrdersPage({
  orders,
  loading,
  error,
  onRefresh,
  refreshing,
  customer,
}: OrdersPageProps) {
  const { t } = useLanguage()
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)
  const payOrder = useCallback(
    async (orderId: string) => {
      try {
        await startRazorpayCheckout({ orderId, apiRequest })
        onRefresh()
      } catch {
        // Razorpay surfaces dismiss/verification errors inside its modal.
        // Leave the card unchanged so the customer can retry.
      }
    },
    [apiRequest, onRefresh]
  )
  const [visibleCount, setVisibleCount] = useState(5)
  const active = orders.filter((o) => !CLOSED_ORDER_STATUSES.includes(o.status))
  const past = orders.filter((o) => !active.includes(o))

  const card = (o: Order) => (
    <article className="order-card" key={o.id}>
      <div className="order-top">
        <div className="mini-logo">{o.restaurant_name?.[0] || 'C'}</div>
        <span>
          <h3>{o.restaurant_name || 'CRAVE order'}</h3>
          <p>
            #{shortId(o.id)} ·{' '}
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
                  : 'We\'ll keep this updated live'}
          </small>
        </span>
        {INVOICED_ORDER_STATUSES.includes(o.status) && (
          <button className="status-action" onClick={() => setInvoiceOrder(o)}>
            {t.customer.viewInvoice}
          </button>
        )}
        {(o.status === 'payment_pending' || o.status === 'payment_submitted') && (
          <button className="status-action" onClick={() => void payOrder(o.id)}>
            Pay Now
          </button>
        )}
      </div>
      {o.refunds?.[0] && (
        <div className={`refund-status ${o.refunds[0].status}`}>
          <Icon name={o.refunds[0].status === 'completed' ? 'check' : 'refresh'} />
          <span>
            <b>
              Refund{' '}
              {o.refunds[0].status === 'processing' ? 'pending with Razorpay' : o.refunds[0].status}
            </b>
            <small>
              {money((o.refunds[0].amount_paise ?? o.refunds[0].amount * 100) / 100)}
              {o.refunds[0].status === 'completed'
                ? ' confirmed by the payment provider'
                : ' refund request'}
            </small>
          </span>
        </div>
      )}
      {showDeliveryCode(o) ? (
        <div className="otp">
          <span>
            <b>{t.customer.deliveryCode}</b>
            <small>{t.customer.shareCode}</small>
          </span>
          <strong>{o.delivery_otp}</strong>
        </div>
      ) : o.otp_consumed_at ? (
        <div className="otp done">
          <span>
            <b>{t.customer.codeVerified}</b>
            <small>{t.customer.codeVerifiedHint}</small>
          </span>
          <Icon name="check" />
        </div>
      ) : null}
    </article>
  )

  return (
    <section className="page orders">
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
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
            title={t.customer.noOrdersYet}
            text="Your first great meal is a few taps away."
          />
        ) : (
          <>
            <h2 className="section-title">
              Active <span>{active.length}</span>
            </h2>
            {active.length ? (
              active.slice(0, visibleCount).map(card)
            ) : (
              <p className="muted">No active deliveries right now.</p>
            )}
            {active.length > visibleCount && (
              <button className="load-more" onClick={() => setVisibleCount((v) => v + 5)}>
                Show {Math.min(5, active.length - visibleCount)} more
              </button>
            )}
            {past.length && (
              <>
                <h2 className="section-title">
                  Past <span>{past.length}</span>
                </h2>
                {past.slice(0, visibleCount).map(card)}
                {past.length > visibleCount && (
                  <button className="load-more" onClick={() => setVisibleCount((v) => v + 5)}>
                    Show {Math.min(5, past.length - visibleCount)} more
                  </button>
                )}
              </>
            )}
          </>
        )}
      </PullToRefresh>
      {invoiceOrder && (
        <div className="modal-overlay" onClick={() => setInvoiceOrder(null)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setInvoiceOrder(null)}>
              <Icon name="close" />
            </button>
            <h2>Invoice</h2>
            <p>Order #{shortId(invoiceOrder.id)}</p>
            <p>{invoiceOrder.restaurant_name}</p>
            <p>Total: {money(invoiceOrder.total_amount)}</p>
            <button className="primary" onClick={() => setInvoiceOrder(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}