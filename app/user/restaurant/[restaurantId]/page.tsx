'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RestaurantDirectRoutePage() {
  const router = useRouter()
  const params = useParams()
  const restaurantId = params?.restaurantId as string

  useEffect(() => {
    if (restaurantId) {
      router.replace(`/user/explore?restaurant=${encodeURIComponent(restaurantId)}`)
    } else {
      router.replace('/user/explore')
    }
  }, [restaurantId, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfa] dark:bg-[#0c120e]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
          Opening Restaurant...
        </p>
      </div>
    </div>
  )
}
