'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { AdminDashboardSkeleton } from '@/components/ui/SkeletonLoaders'

export default function AdminIndexPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login?logout=1')
    } else {
      router.replace('/admin/dashboard')
    }
  }, [user, isLoading, router])

  return <AdminDashboardSkeleton />
}
