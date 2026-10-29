'use client'

import CustomerDashboard from '@/components/dashboards/CustomerDashboard'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { LogIn, RefreshCw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
  const hasNavigated = useRef(false)

  // Safety timer: If preloader runs for > 3.5s, give user clear escape hatches
  useEffect(() => {
    if (!isLoading && user) return
    const timer = setTimeout(() => {
      setLoadTimeoutExceeded(true)
    }, 3500)
    return () => clearTimeout(timer)
  }, [isLoading, user])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#121815] dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#d9f447] selection:text-[#121815]">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 size-[520px] bg-gradient-to-b from-[#d9f447]/15 via-[#d9f447]/5 to-transparent blur-[140px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03] dark:opacity-[0.04]" />

        <CravePagePreloader
          title="Loading Customer Dashboard"
          subtitle="Preparing menus, saved addresses and live orders"
          minHeight="min-h-[260px]"
        />
        {loadTimeoutExceeded && (
          <div className="mt-8 flex flex-col items-center gap-3.5 text-center animate-in fade-in duration-300 max-w-sm">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Session validation taking longer than expected?
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 backdrop-blur-sm active:scale-95 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="size-3.5" />
                <span>Reload Page</span>
              </button>
              <Link
                href="/login?logout=1"
                className="px-5 py-2.5 rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] text-xs font-black shadow-md hover:opacity-90 active:scale-95 flex items-center gap-1.5 transition-all"
              >
                <LogIn className="size-3.5" />
                <span>Go to Sign In</span>
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
            onClick={() => router.replace('/login')}
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
