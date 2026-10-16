'use client'

import { initializeNativeRestaurantBridge } from '@/lib/native-restaurant'
import { useEffect, type ReactNode } from 'react'

export default function VendorLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined

    void initializeNativeRestaurantBridge()
      .then((bridgeCleanup) => {
        if (disposed) bridgeCleanup()
        else cleanup = bridgeCleanup
      })
      .catch((error) => console.warn('[native] Restaurant bridge initialization failed:', error))

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  return children
}
