'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  qty: number
  price: number
  detail?: string
  image?: string
  veg?: boolean
  restaurantName?: string
  restaurantId?: string
  vendorId?: string
  restaurantLat?: number
  restaurantLng?: number
  in_stock?: boolean
  inStock?: boolean
  stock_count?: number
  stockCount?: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateItemQty: (id: string, delta: number) => void
  clearCart: () => void
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  totalCount: number
  isLoaded: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = 'crave_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch (e) {
      console.error('Error loading cart from localStorage:', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch (e) {
        console.error('Error saving cart to localStorage:', e)
      }
    }
  }, [items, isLoaded])

  const addItem = (item: CartItem) => {
    const isOutOfStock =
      item.in_stock === false ||
      item.inStock === false ||
      (item.stock_count !== undefined && item.stock_count !== null && item.stock_count <= 0) ||
      (item.stockCount !== undefined && item.stockCount !== null && item.stockCount <= 0)

    if (isOutOfStock) {
      return
    }

    setItems((prev) => {
      if (prev.length > 0 && item.restaurantId) {
        const existingRestaurantId = prev[0].restaurantId
        if (existingRestaurantId && existingRestaurantId !== item.restaurantId) {
          return [item]
        }
      }
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + item.qty } : i))
      }
      return [...prev, item]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateItemQty = (id: string, delta: number) => {
    setItems(
      (prev) =>
        prev
          .map((i) => {
            if (i.id === id) {
              const isOutOfStock =
                i.in_stock === false ||
                i.inStock === false ||
                (i.stock_count !== undefined && i.stock_count !== null && i.stock_count <= 0) ||
                (i.stockCount !== undefined && i.stockCount !== null && i.stockCount <= 0)

              if (isOutOfStock && delta > 0) {
                return i
              }

              const newQty = i.qty + delta
              return newQty > 0 ? { ...i, qty: newQty } : null
            }
            return i
          })
          .filter(Boolean) as CartItem[]
    )
  }

  const clearCart = () => setItems([])

  const totalCount = items.reduce((sum, item) => sum + item.qty, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItemQty,
        clearCart,
        setItems,
        totalCount,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
