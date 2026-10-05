import React from 'react'
import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockWsInstances: any[] = []

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

describe('WebSocket Hooks - useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWsInstances.length = 0
  })

  it('connects to WebSocket on mount with correct URL', async () => {
    const mockWsInstance: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onclose: null as any,
      onmessage: null as any,
      onerror: null as any,
    }
    mockWsInstances.push(mockWsInstance)

    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      expect(url).toMatch(/ws:\/\/.*\/api\/ws/)
      return mockWsInstance
    }) as any

    const { useWebSocket } = await import('@/lib/websocket')
    const mockOnConnect = jest.fn()

    const { result } = renderHook(() =>
      useWebSocket({
        channels: ['order_update'],
        customerId: 'usr_1',
        onConnect: mockOnConnect,
      })
    )

    expect(result.current.connected).toBe(false)

    await act(async () => {
      mockWsInstance.onopen()
    })

    expect(result.current.connected).toBe(true)
    expect(mockOnConnect).toHaveBeenCalled()
    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        channels: ['order_update'],
        customerId: 'usr_1',
      })
    )
  })

  it('calls onMessage when WebSocket receives a message', async () => {
    const mockWsInstance: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onclose: null as any,
      onmessage: null as any,
      onerror: null as any,
    }

    global.WebSocket = jest.fn().mockImplementation(() => mockWsInstance) as any

    const { useWebSocket } = await import('@/lib/websocket')
    const mockHandler = jest.fn()

    renderHook(() =>
      useWebSocket({
        channels: ['order_update'],
        customerId: 'usr_1',
        onMessage: mockHandler,
      })
    )

    const testMessage = {
      channel: 'order_update',
      data: { orderId: 'ord_1', status: 'preparing' },
      ts: Date.now(),
    }

    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify(testMessage) })
    })

    expect(mockHandler).toHaveBeenCalledWith(testMessage)
  })

  it('auto-reconnects after disconnection', async () => {
    let wsInstance: any
    global.WebSocket = jest.fn().mockImplementation(() => {
      wsInstance = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
        onopen: null as any,
        onclose: null as any,
        onmessage: null as any,
        onerror: null as any,
      }
      return wsInstance
    }) as any

    jest.useFakeTimers()
    const { useWebSocket } = await import('@/lib/websocket')

    const { result, unmount } = renderHook(() =>
      useWebSocket({
        channels: ['order_update'],
        customerId: 'usr_1',
        reconnectInterval: 1000,
      })
    )

    await act(async () => {
      wsInstance.onopen()
    })

    expect(result.current.connected).toBe(true)

    await act(async () => {
      wsInstance.onclose()
    })

    expect(result.current.connected).toBe(false)

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(global.WebSocket).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
    unmount()
  })

  it('sends messages only when WebSocket is open', async () => {
    const mockWsInstance: any = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null as any,
      onclose: null as any,
      onmessage: null as any,
      onerror: null as any,
    }

    global.WebSocket = jest.fn().mockImplementation(() => mockWsInstance) as any

    const { useWebSocket } = await import('@/lib/websocket')

    const { result } = renderHook(() => useWebSocket({ channels: ['order_update'] }))

    await act(async () => {
      mockWsInstance.onopen()
    })

    result.current.sendMessage('ping', { test: true })

    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping', test: true }))
  })
})
