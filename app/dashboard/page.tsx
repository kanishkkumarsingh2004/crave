'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function DashboardRedirectPage() {
  const { user, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }

    const targetPath = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`
    router.replace(targetPath)
  }, [user, role, router])

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
