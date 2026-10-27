'use client'

import CraveXPStore from '@/components/dashboards/CraveXPStore'
import Navbar from '@/components/Navbar'
import { CustomerDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UserCraveXPPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login?logout=1')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return <CustomerDashboardSkeleton />
  }

  return (
    <>
      <Navbar />
      <CraveXPStore />
    </>
  )
}
