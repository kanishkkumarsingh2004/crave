import React, { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'usr_test_user', name: 'Test User', role: 'user' },
    role: 'user',
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/lib/websocket', () => ({
  useOrderUpdates: jest.fn(),
  useApprovalUpdates: jest.fn(),
  useDriverLocation: jest.fn(),
  useWebSocket: jest.fn(),
}))

jest.mock('@/lib/toast-context', () => ({
  useToast: () => ({ toast: jest.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/lib/cart-context', () => ({
  useCart: () => ({
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    setItems: jest.fn(),
    totalCount: 0,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('lucide-react', () => {
  const React = require('react')
  return {
    ...jest.requireActual('lucide-react'),
    Clock: (props: any) => React.createElement('div', { 'data-testid': 'clock', ...props }),
  }
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/user/track',
  useSearchParams: () => ({ get: jest.fn(), toString: () => '' }),
}))

describe('CustomerDashboard - Order Tracking View', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('displays order status progression correctly', async () => {
    const mockOrders = [
      {
        id: 'ord_1',
        customer_name: 'Test Customer',
        status: 'out_for_delivery',
        total_amount: 168,
        restaurant_name: 'Spice Garden',
        items: [{ name: 'Pizza', qty: 1, price: 150 }],
        created_at: new Date().toISOString(),
        driver_name: 'Rider A',
        delivery_otp: '1234',
      },
    ]

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/orders?customerId')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, orders: mockOrders }),
        })
      }
      if (url.includes('/restaurants')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              restaurants: [{ id: 'vnd_1', name: 'Spice Garden', menu_items: [] }],
            }),
        })
      }
      if (url.includes('/payment-config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ config: { upiVpa: 'crave@upi', baseDeliveryFee: 30 } }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    require('@/lib/websocket').useOrderUpdates.mockImplementation((_id: string, cb: any) => {
      useEffect(() => {
        cb([
          {
            id: 'ord_1',
            customerName: 'Test Customer',
            restaurantName: 'Spice Garden',
            status: 'In Progress',
            total: 168,
          },
        ])
      }, [])
    })

    const { default: CustomerDashboard } = await import('@/components/dashboards/CustomerDashboard')
    render(<CustomerDashboard />)

    await waitFor(() => {
      expect(screen.getAllByText(/Spice Garden/i)[0]).toBeInTheDocument()
    })
  })

  it('shows pending payment status for new orders', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/orders?customerId')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              orders: [
                {
                  id: 'ord_new',
                  customer_name: 'Customer',
                  status: 'new',
                  total_amount: 200,
                  payment_status: 'pending',
                  restaurant_name: 'Restaurant',
                  items: [],
                  created_at: new Date().toISOString(),
                },
              ],
            }),
        })
      }
      if (url.includes('/restaurants')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              restaurants: [{ id: 'vnd_1', name: 'Restaurant', menu_items: [] }],
            }),
        })
      }
      if (url.includes('/payment-config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ config: { upiVpa: 'crave@upi', merchantName: 'Crave' } }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    require('@/lib/websocket').useOrderUpdates.mockImplementation(() => {})

    const { default: CustomerDashboard } = await import('@/components/dashboards/CustomerDashboard')
    render(<CustomerDashboard initialTab="live-order" initialOrderId="ord_new" />)

    await waitFor(() => {
      expect(screen.getByText(/Payment Pending/i)).toBeInTheDocument()
    })
  })
})
