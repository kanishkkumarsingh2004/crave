'use client'

import CraveXPStore from '@/components/dashboards/CraveXPStore'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UserCraveXPPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Loading craveXP Instamart...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <CraveXPStore />
    </>
  )
}
