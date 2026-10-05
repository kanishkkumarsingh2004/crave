'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminIndexPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else {
      router.replace('/admin/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
          Redirecting to Admin Command Center...
        </p>
      </div>
    </div>
  )
}
