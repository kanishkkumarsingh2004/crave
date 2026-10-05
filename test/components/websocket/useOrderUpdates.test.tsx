import React from 'react'
import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'usr_test_user', name: 'Test User', role: 'user' },
    role: 'user',
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    token: 'test-token',
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/map', () => ({
  MapComponent: () => <div data-testid="map" />,
}))

jest.mock('lucide-react', () => {
  const React = require('react')
  return {
    ...jest.requireActual('lucide-react'),
    MapPin: (props: any) => React.createElement('div', { 'data-testid': 'map-pin', ...props }),
  }
})

describe('WebSocket Hooks - useOrderUpdates', () => {
  let mockWsInstance: any
  let capturedOpts: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockWsInstance = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onclose: null as any,
      onmessage: null as any,
      onerror: null as any,
    }
    capturedOpts = null

    global.WebSocket = jest.fn().mockImplementation(() => mockWsInstance) as any
  })

  it('subscribes to order_update channel', async () => {
    const mockCallback = jest.fn()
    const { useOrderUpdates } = await import('@/lib/websocket')

    renderHook(() => useOrderUpdates('usr_1', mockCallback))

    await act(async () => {
      mockWsInstance.onopen()
    })

    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        channels: ['order_update'],
        customerId: 'usr_1',
      })
    )
  })

  it('processes incoming order_update messages with single order data', async () => {
    const mockCallback = jest.fn()
    const { useOrderUpdates } = await import('@/lib/websocket')

    renderHook(() => useOrderUpdates('usr_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'order_update',
          data: {
            order: {
              id: 'ord_1',
              customer_name: 'Test Customer',
              restaurant_name: 'Spice Garden',
              items: JSON.stringify([{ name: 'Burger', qty: 1, price: 150 }]),
              total_amount: 168,
              status: 'preparing',
            },
          },
          ts: Date.now(),
        }),
      })
    })

    expect(mockCallback).toHaveBeenCalled()
    const orders = mockCallback.mock.calls[0][0]
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe('ord_1')
    expect(orders[0].restaurantName).toBe('Spice Garden')
  })

  it('processes incoming order_update messages with orders array data', async () => {
    const mockCallback = jest.fn()
    const { useOrderUpdates } = await import('@/lib/websocket')

    renderHook(() => useOrderUpdates('usr_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'order_update',
          data: {
            orders: [
              { id: 'ord_1', customer_name: 'A', total_amount: 100 },
              { id: 'ord_2', customer_name: 'B', total_amount: 200 },
            ],
          },
        }),
      })
    })

    expect(mockCallback).toHaveBeenCalled()
    expect(mockCallback.mock.calls[0][0]).toHaveLength(2)
  })

  it('ignores messages on different channels', async () => {
    const mockCallback = jest.fn()
    const { useOrderUpdates } = await import('@/lib/websocket')

    renderHook(() => useOrderUpdates('usr_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'driver_location',
          data: { lat: 12.9716, lng: 77.5946 },
        }),
      })
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('maps order status correctly', async () => {
    const statusMap: Record<string, string> = {}
    const mockCallback1 = jest.fn((orders: any) => {
      statusMap['ord_1'] = orders[0].status
    })
    const mockCallback2 = jest.fn((orders: any) => {
      statusMap['ord_2'] = orders[0].status
    })

    const { useOrderUpdates } = await import('@/lib/websocket')

    renderHook(() => useOrderUpdates('usr_1', mockCallback1))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'order_update',
          data: {
            order: {
              id: 'ord_1',
              customer_name: 'Test',
              restaurant_name: 'Restaurant',
              items: '[]',
              total_amount: 100,
              status: 'delivered',
            },
          },
        }),
      })
    })

    renderHook(() => useOrderUpdates('usr_1', mockCallback2))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'order_update',
          data: {
            order: {
              id: 'ord_2',
              customer_name: 'Test',
              restaurant_name: 'Restaurant',
              items: '[]',
              total_amount: 100,
              status: 'new',
            },
          },
        }),
      })
    })

    expect(statusMap['ord_1']).toBe('Delivered')
    expect(statusMap['ord_2']).toBe('In Progress')
  })
})
