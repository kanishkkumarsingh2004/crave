'use client'

import CustomerDashboard from '@/components/dashboards/CustomerDashboard'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { LogIn, RefreshCw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CravePagePreloader } from '@/components/ui/ModernPreloader'

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
  const [loadTimeoutExceeded, setLoadTimeoutExceeded] = useState(false)

  // Safety timer: If preloader runs for > 3.5s, give user clear escape hatches
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
    } else if (role !== 'user' && role !== 'customer') {
      router.replace(`/${getDashboardPath(role)}`)
    }
  }, [user, role, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#121815] flex flex-col items-center justify-center p-4">
        <CravePagePreloader
          title="Loading Customer Dashboard..."
          subtitle="Preparing menus, saved addresses and live orders"
          minHeight="min-h-[280px]"
        />
        {loadTimeoutExceeded && (
          <div className="mt-6 flex flex-col items-center gap-3 text-center animate-in fade-in duration-300">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Session validation taking longer than expected?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-black/5 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="size-3.5" />
                Reload Page
              </button>
              <Link
                href="/login?logout=1"
                className="px-4 py-2 rounded-xl bg-[#121815] text-[#d9f447] dark:bg-[#d9f447] dark:text-[#121815] text-xs font-bold hover:opacity-90 flex items-center gap-1.5 transition"
              >
                <LogIn className="size-3.5" />
                Go to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    )
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
            onClick={() => window.location.replace('/login')}
            className="px-5 py-2.5 rounded-xl bg-[#121815] text-[#d9f447] text-xs font-bold hover:opacity-90 transition shadow-sm"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>
    )
  }

  if (role !== 'user' && role !== 'customer') {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl border border-amber-200">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c]">Redirecting to Your Dashboard</h2>
          <p className="mt-2 text-xs text-gray-600">
            You are logged in as a <span className="font-bold capitalize">{role}</span>.
          </p>
          <button
            onClick={() => router.push(`/${getDashboardPath(role)}`)}
            className="mt-6 rounded-full bg-[#18201c] px-6 py-2.5 text-xs font-bold text-white"
          >
            Go to {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <CustomerDashboard />
}
