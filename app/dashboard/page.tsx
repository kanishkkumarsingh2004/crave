'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { CustomerDashboardSkeleton } from '@/components/ui/SkeletonLoaders'

export default function DashboardRedirectPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login?logout=1')
      return
    }

    const targetPath =
      role === 'user' || role === 'customer'
        ? '/user/dashboard'
        : role === 'restaurant_vendor' || role === 'vendor'
          ? '/vendor/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'rider' || role === 'driver'
              ? '/driver/dashboard'
              : role === 'admin'
                ? '/admin/dashboard'
                : '/login'
    router.replace(targetPath)
  }, [user, role, isLoading, router])

  return <CustomerDashboardSkeleton />
}
