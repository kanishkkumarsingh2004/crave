'use client'

import { CustomerDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UserIndexPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login?logout=1')
    } else {
      router.replace('/user/dashboard')
    }
  }, [user, isLoading, router])

  return <CustomerDashboardSkeleton />
}
