'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Sparkles, Check, UtensilsCrossed } from 'lucide-react'
import type { CartItem } from '@/lib/contexts/cart-context'

interface RecommendedItem {
  id: string
  name: string
  price: number
  description: string
  category: string
  image: string
  is_veg: boolean
  restaurantId: string
  restaurantName: string
  recommendationReason: string
}

interface CartUpsellStripProps {
  restaurantId?: string
  restaurantName?: string
  cartItemIds: string[]
  onAddToCart: (item: CartItem) => void
}

export default function CartUpsellStrip({
  restaurantId,
  restaurantName,
  cartItemIds,
  onAddToCart,
}: CartUpsellStripProps) {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!restaurantId || cartItemIds.length === 0) {
      setRecommendations([])
      return
    }

    let isMounted = true
    const fetchUpsells = async () => {
      setLoading(true)
      try {
        const url = `/api/recommendations?type=cart_upsell&restaurantId=${encodeURIComponent(
          restaurantId
        )}&itemIds=${encodeURIComponent(cartItemIds.join(','))}&limit=6`

        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()

        if (isMounted && data.success && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations)
        }
      } catch (err) {
        console.error('Failed to load cart upsell recommendations:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchUpsells()
    return () => {
      isMounted = false
    }
  }, [restaurantId, cartItemIds.join(',')])

  if (!restaurantId || (!loading && recommendations.length === 0)) {
    return null
  }

  const handleAdd = (item: RecommendedItem) => {
    setAddedMap((prev) => ({ ...prev, [item.id]: true }))
    onAddToCart({
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      qty: 1,
      price: item.price,
      detail: item.description,
      image: item.image,
      veg: item.is_veg,
      restaurantId: item.restaurantId || restaurantId,
      restaurantName: item.restaurantName || restaurantName,
    })

    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [item.id]: false }))
    }, 1500)
  }

  return (
    <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl mb-6 transition-all animate-in fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#5e8210]/10 dark:bg-[#d9f447]/10 text-[#5e8210] dark:text-[#d9f447] grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#121815] dark:text-white flex items-center gap-2">
              <span>Complete Your Meal</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                Frequently Paired
              </span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Popular add-ons and pairings from {restaurantName || 'this kitchen'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="w-48 h-32 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse shrink-0"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto pb-2 custom-scrollbar">
          {recommendations.map((item) => {
            const isAdded = Boolean(addedMap[item.id])
            return (
              <div
                key={item.id}
                className="w-48 sm:w-52 shrink-0 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3 flex flex-col justify-between hover:border-[#5e8210]/40 dark:hover:border-[#d9f447]/40 transition group"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden mb-2.5 bg-black/5 dark:bg-white/5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                        }}
                        className="size-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="size-full grid place-items-center text-stone-400">
                        <UtensilsCrossed className="size-6 opacity-30" />
                      </div>
                    )}

                    {/* Veg / Non-Veg Indicator Dot */}
                    <div className="absolute top-2 left-2 size-4 rounded-sm border bg-white dark:bg-[#121815] grid place-items-center border-stone-300 dark:border-stone-700 shadow-xs">
                      <span
                        className={`size-2 rounded-full ${
                          item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-[#121815] dark:text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {item.recommendationReason || item.category}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-xs font-black text-[#121815] dark:text-white font-mono">
                    ₹{item.price}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAdd(item)}
                    disabled={isAdded}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] hover:opacity-90'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="size-3 stroke-[3]" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3 stroke-[3]" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
