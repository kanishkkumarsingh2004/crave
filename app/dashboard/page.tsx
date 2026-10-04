'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardRedirectPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
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

  return (
    <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
          Redirecting to {role} Dashboard...
        </p>
      </div>
    </div>
  )
}
