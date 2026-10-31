'use client'

import CraveXPStore from '@/components/dashboards/CraveXPStore'
import Navbar from '@/components/Navbar'
import { CraveXPSkeleton } from '@/components/ui/CraveSkeleton'
import { useAuth } from '@/lib/auth-context'

export default function UserCraveXPPage() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <CraveXPSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0c] text-[#18201c] dark:text-[#f2f4f2] antialiased selection:bg-[#86a018] selection:text-white transition-colors duration-300">
      <Navbar />
      <CraveXPStore />
    </div>
  )
}
