'use client'

import CustomerDashboard from '@/components/dashboards/CustomerDashboard'
import { ExploreSkeleton } from '@/components/ui/CraveSkeleton'
import { useAuth } from '@/lib/auth-context'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const getDashboardPath = (role: string) => {
  switch (role) {
    case 'restaurant_vendor':
    case 'cravexp_store_vendor':
      return 'vendor/dashboard'
    case 'rider':
    case 'driver':
      return 'driver/dashboard'
    case 'admin':
      return 'admin/dashboard'
    default:
      return 'login'
  }
}

export default function UserExplorePage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login?redirect=/user/explore')
    } else if (role !== 'user' && role !== 'customer') {
      router.replace(`/${getDashboardPath(role)}`)
    }
  }, [user, role, isLoading, router])

  if (isLoading || !user) {
    return <ExploreSkeleton />
  }

  if (role !== 'user' && role !== 'customer') {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white dark:bg-[#121815] p-8 text-center shadow-xl border border-stone-200 dark:border-white/10">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">Redirecting to Your Dashboard</h2>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            You are logged in as a <span className="font-bold capitalize">{role}</span>.
          </p>
          <button
            onClick={() => router.push(`/${getDashboardPath(role)}`)}
            className="mt-6 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-2.5 text-xs font-bold text-white dark:text-[#18201c]"
          >
            Go to {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <CustomerDashboard initialTab="explore" />
}
