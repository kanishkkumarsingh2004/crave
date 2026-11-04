import { useState, useEffect } from 'react'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { AccessibleDialog } from '@crave/mobile-core'
import { money, label as titleCase, shortId } from '@crave/mobile-core'
import { rupees } from '../../utils/format'
import type { Order, User, Restaurant } from '../../types'

interface InvoiceSheetProps {
  order: Order
  customer?: User | null
  onClose: () => void
}

export function InvoiceSheet({ order, customer, onClose }: InvoiceSheetProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const lines = Array.isArray(order.items) ? order.items : []
  const subtotal = Number(order.subtotal ?? order.total_amount)
  const total = Number(order.total_amount)
  const created = order.created_at ? new Date(order.created_at) : null
  const date = created
    ? `${String(created.getDate()).padStart(2, '0')}/${String(created.getMonth() + 1).padStart(
        2,
        '0'
      )}/${created.getFullYear()}`
    : ''
  const time = created
    ? `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(
        2,
        '0'
      )}:${String(created.getSeconds()).padStart(2, '0')}`
    : ''
  const guestName = order.customer_name || customer?.name || 'Guest'

  useEffect(() => {
    let cancelled = false
    if (!order.restaurant_id) return undefined
    apiRequest<{ restaurants: Restaurant[] }>('/api/restaurants')
      .then((response) => {
        if (cancelled) return
        const match = (response.restaurants || []).find((entry) => entry.id === order.restaurant_id)
        if (match) setRestaurant(match)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [order.restaurant_id])

  const snapshot = (order as any).financial_snapshot || {}
  const charges: [string, number][] = [
    ['Packaging', Number(order.packaging_fee)],
    ['Delivery', Number(order.delivery_fee)],
    ['Platform fee', Number(order.platform_fee)],
    ['Handling', Number(order.handling_fee)],
    ['Service tax', Number(snapshot.platformServiceTaxBreakdown?.totalGstPaise || 0) / 100],
  ].filter(([, value]) => Number(value) > 0) as [string, number][]

  const charged = subtotal + charges.reduce((sum, [, value]) => sum + value, 0)
  const rounding = Number((total - charged).toFixed(2))
  if (rounding !== 0) charges.push(['Rounding', rounding])

  return (
    <AccessibleDialog
      className="bottom-sheet invoice-sheet"
      labelledBy="invoice-title"
      onClose={onClose}
    >
      <div className="sheet-handle" />
      <button className="invoice-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>

      <div className="receipt">
        <div className="receipt-head">
          <div>
            <h2 id="invoice-title" className="receipt-title">
              Order
            </h2>
            <p className="receipt-sub">Receipt #{shortId(order.id)}</p>
          </div>
          <div className="receipt-head-right">
            <p className="receipt-shop">{order.restaurant_name || 'CRAVE'}</p>
            <span className="receipt-stamp">Paid</span>
          </div>
        </div>

        <p className="receipt-line">
          {date} {time}
        </p>

        <p className="receipt-label">Address</p>
        <p className="receipt-line receipt-line-icon">
          <Icon name="pin" />
          <span>{order.customer_address || '—'}</span>
        </p>

        <div className="receipt-kv">
          <span>
            <Icon name="user" /> Client
          </span>
          <b>{guestName}</b>
        </div>
        <div className="receipt-kv">
          <span>
            <Icon name="tag" /> Transaction
          </span>
          <b>{order.utr_ref || '—'}</b>
        </div>
        <div className="receipt-kv">
          <span>
            <Icon name="wallet" /> Location
          </span>
          <b>{order.payment_method || 'UPI'}</b>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>QTY</th>
              <th>DESCRIPTION</th>
              <th>COST</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item: any, index: number) => {
              const quantity = Number(item.quantity) || 1
              const cost = Number(item.lineTotal ?? (item.price || 0) * quantity)
              return (
                <tr key={`${item.id || 'item'}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{quantity}</td>
                  <td>{item.name || 'Item'}</td>
                  <td>{money(cost)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="receipt-divider">
          <span aria-hidden="true">✦</span>
        </div>
        <div className="receipt-total">
          <span>Sub Total :</span>
          <b>{rupees(subtotal)}</b>
        </div>
        {charges.map(([label, value]) => (
          <div className="receipt-total" key={label}>
            <span>{label} :</span>
            <b>{rupees(value)}</b>
          </div>
        ))}
        <div className="receipt-total receipt-grand">
          <span>Order Total :</span>
          <b>{rupees(total)}</b>
        </div>
        <div className="receipt-divider">
          <span aria-hidden="true">✦</span>
        </div>

        <p className="receipt-thanks">
          <span aria-hidden="true">✦</span> THANK YOU! <span aria-hidden="true">✦</span>
        </p>
        <div className="receipt-brand">
          <b>CRAVE</b>
          <i>.</i>
        </div>
        <p className="receipt-tagline">Delivered with care</p>
        <div className="receipt-sign">
          <span>RESTAURANT</span>
          <b>{order.restaurant_name || 'CRAVE'}</b>
        </div>
        <div className="receipt-sign">
          <span>ADDRESS</span>
          <b>{restaurant?.address || '—'}</b>
        </div>
        <div className="receipt-sign">
          <span>FSSAI LICENCE</span>
          <b>{restaurant?.fssai_license || '—'}</b>
        </div>
        <div className="receipt-strip" aria-hidden="true" />
      </div>
    </AccessibleDialog>
  )
}