'use client'

import CraveXPStoreConsole from '@/components/dashboards/CraveEPStoreConsole'
import { useAuth } from '@/lib/auth-context'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CraveXPStorePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loadTimeoutExceeded, setLoadTimeoutExceeded] = useState(false)

  useEffect(() => {
    if (!isLoading && user) return
    const timer = setTimeout(() => setLoadTimeoutExceeded(true), 3500)
    return () => clearTimeout(timer)
  }, [isLoading, user])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (user.role !== 'cravexp_store_vendor' && user.role !== 'admin') {
      router.replace(user.role === 'user' ? '/user/dashboard' : '/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] dark:text-white uppercase tracking-wider">
            Loading CraveXP Console...
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

  if (!user || (user.role !== 'cravexp_store_vendor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white dark:bg-[#121815] p-8 text-center shadow-xl border border-stone-200 dark:border-[#223026]">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">
            Store Vendor Access Only
          </h2>
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
            This console is reserved for CraveXP dark store operators.
          </p>
          <button
            onClick={() => router.push(user ? '/dashboard' : '/login')}
            className="mt-6 rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-6 py-2.5 text-xs font-bold"
          >
            Go to {user ? 'Your Dashboard' : 'Sign In'}
          </button>
        </div>
      </div>
    )
  }

  return <CraveXPStoreConsole />
}
