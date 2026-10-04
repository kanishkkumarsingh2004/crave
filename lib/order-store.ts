import fs from 'fs'
import path from 'path'

export interface OrderRecord {
  id: string
  customer_id: string
  customer_name: string
  customer_phone?: string
  customer_address: string
  restaurant_id: string
  restaurant_name: string
  items: any[]
  subtotal: number
  packaging_fee: number
  gst: number
  total_amount: number
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled'
  payment_method: string
  delivery_otp: string
  driver_name?: string
  driver_phone?: string
  driver_lat?: number
  driver_lng?: number
  utr_ref?: string
  customer_vpa?: string
  payment_status?: 'pending' | 'verified' | 'rejected'
  createdAt: string
}

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json')

function ensureOrdersFile() {
  const dir = path.dirname(ORDERS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8')
  }
}

export function getOrders(): OrderRecord[] {
  try {
    ensureOrdersFile()
    const content = fs.readFileSync(ORDERS_FILE, 'utf-8')
    return JSON.parse(content) || []
  } catch (err) {
    return []
  }
}

export function saveOrder(order: OrderRecord): void {
  try {
    ensureOrdersFile()
    const orders = getOrders()
    const index = orders.findIndex((o) => o.id === order.id)
    if (index >= 0) {
      orders[index] = { ...orders[index], ...order }
    } else {
      orders.unshift(order)
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save order:', err)
  }
}
