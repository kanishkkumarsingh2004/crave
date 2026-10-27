'use client'

import React, { useEffect, useState } from 'react'
import { RotateCcw, Clock, ArrowRight, Utensils, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CartItem } from '@/lib/contexts/cart-context'
import { useCart } from '@/lib/contexts/cart-context'

interface ReorderPackage {
  orderId: string
  restaurantId: string
  restaurantName: string
  orderedAt: string
  totalAmount: number
  items: Array<{
    id?: string
    name: string
    quantity: number
    price: number
    is_veg?: boolean
  }>
  isAvailable: boolean
  reorderScore: number
}

interface OrderAgainStripProps {
  customerId?: string
  triggerToast?: (msg: string) => void
}

export default function OrderAgainStrip({
  customerId,
  triggerToast,
}: OrderAgainStripProps) {
  const router = useRouter()
  const { addItem, clearCart } = useCart()
  const [packages, setPackages] = useState<ReorderPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [reorderedId, setReorderedId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchReorders = async () => {
      setLoading(true)
      try {
        const url = customerId
          ? `/api/recommendations?type=reorder&customerId=${encodeURIComponent(customerId)}`
          : '/api/recommendations?type=reorder'

        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()

        if (isMounted && data.success && Array.isArray(data.packages)) {
          setPackages(data.packages)
        }
      } catch (err) {
        console.error('Failed to load reorder recommendations:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchReorders()
    return () => {
      isMounted = false
    }
  }, [customerId])

  if (!loading && packages.length === 0) {
    return null
  }

  const handle1ClickReorder = (pkg: ReorderPackage) => {
    setReorderedId(pkg.orderId)
    clearCart()

    for (const item of pkg.items) {
      const cartEntry: CartItem = {
        id: item.id || `dish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: item.quantity || 1,
        veg: item.is_veg,
        restaurantId: pkg.restaurantId,
        restaurantName: pkg.restaurantName,
      }
      addItem(cartEntry)
    }

    if (triggerToast) {
      triggerToast(`Loaded ${pkg.items.length} items from ${pkg.restaurantName} to your cart!`)
    }

    setTimeout(() => {
      router.push('/user/cart')
    }, 400)
  }

  return (
    <div className="pt-2 pb-4 transition-all animate-in fade-in">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 grid place-items-center">
            <RotateCcw className="size-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white tracking-tight flex items-center gap-2">
              <span>Order Again</span>
              <span className="rounded-full bg-orange-500/10 text-orange-800 dark:text-orange-300 border border-orange-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                1-Click Reorder
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Your favorite meals from past delivered orders
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-3.5 overflow-x-auto pb-2 custom-scrollbar">
        {packages.map((pkg) => {
          const isReordered = reorderedId === pkg.orderId
          return (
            <div
              key={pkg.orderId}
              className="w-64 sm:w-72 shrink-0 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18201c]/90 p-4 flex flex-col justify-between shadow-xs hover:border-[#86a018]/50 dark:hover:border-[#d9f447]/50 transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white truncate">
                    {pkg.restaurantName}
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">
                    ₹{pkg.totalAmount}
                  </span>
                </div>

                <div className="space-y-1 my-2 bg-gray-50 dark:bg-white/[0.03] p-2.5 rounded-xl border border-gray-100 dark:border-white/[0.05]">
                  {pkg.items.slice(0, 3).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[170px]">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        ₹{it.price * it.quantity}
                      </span>
                    </div>
                  ))}
                  {pkg.items.length > 3 && (
                    <p className="text-[10px] text-gray-400 font-medium pt-0.5">
                      +{pkg.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>Delivered recently</span>
                </span>

                <button
                  type="button"
                  onClick={() => handle1ClickReorder(pkg)}
                  disabled={isReordered}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                    isReordered
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:opacity-90'
                  }`}
                >
                  {isReordered ? (
                    <>
                      <Check className="size-3.5 stroke-[3]" />
                      <span>Loaded</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-3" />
                      <span>Reorder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
