import React from 'react'
import { render, act, renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CartProvider, useCart } from '@/lib/cart-context'

describe('CartContext & CartProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  it('initializes with empty items when localStorage is empty', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    )
    const { result } = renderHook(() => useCart(), { wrapper })

    expect(result.current.items).toEqual([])
    expect(result.current.totalCount).toBe(0)
    expect(result.current.isLoaded).toBe(true)
  })

  it('loads existing cart items from localStorage on mount', () => {
    const sampleItems = [
      { id: 'item1', name: 'Cheeseburger', qty: 2, price: 120 },
      { id: 'item2', name: 'Fries', qty: 1, price: 60 },
    ]
    localStorage.setItem('crave_cart', JSON.stringify(sampleItems))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    )
    const { result } = renderHook(() => useCart(), { wrapper })

    expect(result.current.items).toEqual(sampleItems)
    expect(result.current.totalCount).toBe(3)
  })

  it('persists items to localStorage when addItem is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    )
    const { result } = renderHook(() => useCart(), { wrapper })

    act(() => {
      result.current.addItem({ id: 'item1', name: 'Pizza', qty: 1, price: 250 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.totalCount).toBe(1)
    expect(localStorage.getItem('crave_cart')).toBe(
      JSON.stringify([{ id: 'item1', name: 'Pizza', qty: 1, price: 250 }])
    )
  })

  it('persists items to localStorage when removeItem is called', () => {
    const sampleItems = [{ id: 'item1', name: 'Pizza', qty: 1, price: 250 }]
    localStorage.setItem('crave_cart', JSON.stringify(sampleItems))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CartProvider>{children}</CartProvider>
    )
    const { result } = renderHook(() => useCart(), { wrapper })

    act(() => {
      result.current.removeItem('item1')
    })

    expect(result.current.items).toEqual([])
    expect(localStorage.getItem('crave_cart')).toBe(JSON.stringify([]))
  })
})
