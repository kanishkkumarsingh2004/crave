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

describe('WebSocket Hooks - useDriverLocation', () => {
  let mockWsInstance: any

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
    global.WebSocket = jest.fn().mockImplementation(() => mockWsInstance) as any
  })

  it('subscribes to driver_location channel with orderId as customerId', async () => {
    const { useDriverLocation } = await import('@/lib/websocket')

    renderHook(() => useDriverLocation('ord_1', jest.fn()))

    await act(async () => {
      mockWsInstance.onopen()
    })

    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        channels: ['driver_location'],
        customerId: 'ord_1',
      })
    )
  })

  it('passes driver location data to callback when orderId matches', async () => {
    const mockCallback = jest.fn()
    const { useDriverLocation } = await import('@/lib/websocket')

    renderHook(() => useDriverLocation('ord_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'driver_location',
          data: { lat: 12.9716, lng: 77.5946, orderId: 'ord_1', driverName: 'Rider A' },
        }),
      })
    })

    expect(mockCallback).toHaveBeenCalled()
  })

  it('ignores messages for different orderId', async () => {
    const mockCallback = jest.fn()
    const { useDriverLocation } = await import('@/lib/websocket')

    renderHook(() => useDriverLocation('ord_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'driver_location',
          data: { lat: 12.9716, lng: 77.5946, orderId: 'ord_2' },
        }),
      })
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('ignores messages on non-driver_location channels', async () => {
    const mockCallback = jest.fn()
    const { useDriverLocation } = await import('@/lib/websocket')

    renderHook(() => useDriverLocation('ord_1', mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({
          channel: 'order_update',
          data: { orderId: 'ord_1' },
        }),
      })
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('returns connected state from useWebSocket', async () => {
    const { useDriverLocation } = await import('@/lib/websocket')

    const { result } = renderHook(() => useDriverLocation('ord_1', jest.fn()))

    await act(async () => {
      mockWsInstance.onopen()
    })

    expect(result.current.connected).toBe(true)
  })
})
