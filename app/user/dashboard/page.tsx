'use client'

import CustomerDashboard from '@/components/dashboards/CustomerDashboard'
import { ExploreSkeleton } from '@/components/ui/CraveSkeleton'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { LogIn, RefreshCw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react'
=======
import { useEffect, useState } from 'react'
import { CustomerDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
>>>>>>> caed678 (feat: add customer and vendor dashboard pages, layouts, and loading skeletons)

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

export default function UserDashboardPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const hasNavigated = useRef(false)

  useEffect(() => {
    if (hasNavigated.current) return
    if (isLoading) return

    if (!user) {
      hasNavigated.current = true
      router.replace('/login')
    } else if (role !== 'user' && role !== 'customer') {
      hasNavigated.current = true
      router.replace(`/${getDashboardPath(role)}`)
    }
  }, [user, role, isLoading, router])

<<<<<<< HEAD
  if (isLoading || !user) {
    return <ExploreSkeleton />
=======
  if (isLoading) {
    return <CustomerDashboardSkeleton />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#121815] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Redirecting to Sign In...
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="px-5 py-2.5 rounded-xl bg-[#121815] text-[#d9f447] text-xs font-bold hover:opacity-90 transition shadow-sm"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>
    )
>>>>>>> caed678 (feat: add customer and vendor dashboard pages, layouts, and loading skeletons)
  }

  if (role !== 'user' && role !== 'customer') {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white dark:bg-[#121815] p-8 text-center shadow-xl border border-stone-200 dark:border-[#223026]">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">Redirecting to Your Dashboard</h2>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            You are logged in as a <span className="font-bold capitalize">{role}</span>.
          </p>
          <button
            onClick={() => router.push(`/${getDashboardPath(role)}`)}
            className="mt-6 rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-6 py-2.5 text-xs font-bold"
          >
            Go to {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <CustomerDashboard />
}
