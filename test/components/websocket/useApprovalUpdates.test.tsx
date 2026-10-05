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

jest.mock('lucide-react', () => {
  const React = require('react')
  return {
    ...jest.requireActual('lucide-react'),
    MapPin: (props: any) => React.createElement('div', { 'data-testid': 'map-pin', ...props }),
  }
})

describe('WebSocket Hooks - useApprovalUpdates', () => {
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

  it('subscribes to approval_update channel without customerId', async () => {
    const { useApprovalUpdates } = await import('@/lib/websocket')

    renderHook(() => useApprovalUpdates(undefined, jest.fn()))

    await act(async () => {
      mockWsInstance.onopen()
    })

    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        channels: ['approval_update'],
      })
    )
  })

  it('passes status from approval_update messages to callback', async () => {
    const mockCallback = jest.fn()
    const { useApprovalUpdates } = await import('@/lib/websocket')

    renderHook(() => useApprovalUpdates(undefined, mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({
        data: JSON.stringify({ channel: 'approval_update', data: { status: 'verified', orderId: 'ord_1' } }),
      })
    })

    expect(mockCallback).toHaveBeenCalledWith('verified')
  })

  it('handles different status values correctly', async () => {
    const mockCallback = jest.fn()
    const { useApprovalUpdates } = await import('@/lib/websocket')

    renderHook(() => useApprovalUpdates(undefined, mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify({ channel: 'approval_update', data: { status: 'pending' } }) })
    })
    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify({ channel: 'approval_update', data: { status: 'verified' } }) })
    })
    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify({ channel: 'approval_update', data: { status: 'rejected' } }) })
    })

    expect(mockCallback.mock.calls).toHaveLength(3)
    expect(mockCallback.mock.calls[0][0]).toBe('pending')
    expect(mockCallback.mock.calls[1][0]).toBe('verified')
    expect(mockCallback.mock.calls[2][0]).toBe('rejected')
  })

  it('ignores messages on other channels', async () => {
    const mockCallback = jest.fn()
    const { useApprovalUpdates } = await import('@/lib/websocket')

    renderHook(() => useApprovalUpdates(undefined, mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify({ channel: 'order_update', data: { status: 'preparing' } }) })
    })

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('uses default status "pending" when data.status is undefined', async () => {
    const mockCallback = jest.fn()
    const { useApprovalUpdates } = await import('@/lib/websocket')

    renderHook(() => useApprovalUpdates(undefined, mockCallback))

    await act(async () => {
      mockWsInstance.onmessage({ data: JSON.stringify({ channel: 'approval_update', data: {} }) })
    })

    expect(mockCallback).toHaveBeenCalledWith('pending')
  })
})
