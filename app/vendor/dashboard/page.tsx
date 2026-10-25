'use client'

import VendorDashboard from '@/components/dashboards/VendorDashboard'
import { useAuth } from '@/lib/auth-context'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VendorDashboardPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const [loadTimeoutExceeded, setLoadTimeoutExceeded] = useState(false)

  // Safety timer: If preloader runs for > 3.5s, provide clear escape hatch
  useEffect(() => {
    if (!isLoading && user) return
    const timer = setTimeout(() => {
      setLoadTimeoutExceeded(true)
    }, 3500)
    return () => clearTimeout(timer)
  }, [isLoading, user])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      window.location.replace('/login')
    } else if (
      role !== 'vendor' &&
      role !== 'restaurant_vendor' &&
      role !== 'admin'
    ) {
      const redirectPath =
        role === 'user' || role === 'customer'
          ? '/user/dashboard'
          : role === 'rider' || role === 'driver'
            ? '/driver/dashboard'
            : role === 'cravexp_store_vendor'
              ? '/vendor/crave-ep'
              : '/login'
      window.location.replace(redirectPath)
    }
  }, [user, role, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] dark:text-white uppercase tracking-wider">
            Loading Kitchen Console...
          </p>
          {loadTimeoutExceeded && (
            <div className="mt-4">
              <a
                href="/login"
                className="inline-block rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-4 py-1.5 text-xs font-bold"
              >
                Go to Sign In
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white dark:bg-[#121815] p-8 text-center shadow-xl border border-stone-200 dark:border-[#223026]">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            Please sign in with your kitchen vendor account to access the console.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-6 py-2.5 text-xs font-bold"
          >
            Sign In to Kitchen Console
          </a>
        </div>
      </div>
    )
  }

  if (role !== 'vendor' && role !== 'restaurant_vendor' && role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white dark:bg-[#121815] p-8 text-center shadow-xl border border-rose-200 dark:border-rose-900/40">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">Access Denied</h2>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            You are logged in as <span className="font-bold capitalize">{role}</span>. Vendor
            Console is restricted to kitchen owners.
          </p>
          <button
            onClick={() =>
              router.push(role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`)
            }
            className="mt-6 rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-6 py-2.5 text-xs font-bold"
          >
            Go to Your {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <VendorDashboard />
}
