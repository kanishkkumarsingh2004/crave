import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_restaurant_vendor',
      name: 'Vendor',
      email: 'restaurant@test.com',
      role: 'restaurant_vendor',
      restaurantName: 'Spice Garden',
    },
    role: 'restaurant_vendor',
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('lucide-react', () => {
  const React = require('react')
  const icons = [
    'ShoppingBag', 'UtensilsCrossed', 'ChartColumn', 'Percent',
    'Settings', 'LogOut', 'Menu', 'X', 'Store', 'ArrowLeft',
    'Star', 'PackageCheck', 'CheckCircle2', 'CookingPot',
    'ArrowUpRight', 'Sparkles',
  ]
  const mockIcons: Record<string, any> = {}
  icons.forEach((name) => {
    mockIcons[name] = (props: any) => React.createElement('div', { 'data-testid': name.toLowerCase(), ...props })
  })
  return mockIcons
})

jest.mock('@/components/ui/map', () => ({
  MapComponent: () => <div data-testid="map" />,
}))

describe('VendorDashboard - Live Orders Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('displays "No orders currently in kitchen queue" when no orders exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, orders: [] }),
    })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No orders currently in kitchen queue/i)).toBeInTheDocument()
    })
  })

  it('renders active orders when they exist', async () => {
    const mockOrders = [
      {
        id: 'ord_1',
        customer_name: 'Test Customer',
        status: 'new',
        total_amount: 168,
        payment_status: 'pending',
        items: [{ name: 'Pizza', qty: 1, price: 150 }],
        created_at: new Date().toISOString(),
        delivery_otp: '1234',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, orders: mockOrders }),
    })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Test Customer/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/₹168/)).toBeInTheDocument()
    expect(screen.getByText(/Payment Pending/i)).toBeInTheDocument()
  })

  it('renders "Kitchen Cooking" badge for preparing orders', async () => {
    const mockOrders = [
      {
        id: 'ord_1',
        customer_name: 'Preparing Customer',
        status: 'preparing',
        total_amount: 200,
        payment_status: 'verified',
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, orders: mockOrders }),
    })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Kitchen Cooking/i)).toBeInTheDocument()
    })
  })

  it('shows active orders count badge', async () => {
    const mockOrders = [
      { id: 'ord_1', status: 'new', customer_name: 'A', total_amount: 100 },
      { id: 'ord_2', status: 'preparing', customer_name: 'B', total_amount: 200 },
      { id: 'ord_3', status: 'ready', customer_name: 'C', total_amount: 300 },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, orders: mockOrders }),
    })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Active Orders \(2\)/i)).toBeInTheDocument()
    })
  })

  it('displays correct daily revenue total', async () => {
    const mockOrders = [
      { id: 'ord_1', status: 'new', customer_name: 'A', total_amount: 500 },
      { id: 'ord_2', status: 'new', customer_name: 'B', total_amount: 300 },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, orders: mockOrders }),
    })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('₹800')).toBeInTheDocument()
    })
  })

  it('calls PATCH orders API when "Start Preparing" is clicked', async () => {
    const mockOrders = [
      { id: 'ord_1', status: 'new', customer_name: 'A', total_amount: 100 },
    ]

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, orders: mockOrders }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, order: { status: 'preparing' } }),
      })

    const { default: VendorDashboard } = await import('@/components/dashboards/VendorDashboard')
    render(<VendorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('New Order')).toBeInTheDocument()
    })

    const startButton = screen.getByText('Start Preparing')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'ord_1', status: 'preparing' }),
      })
    })
  })
})
