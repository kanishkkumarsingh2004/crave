'use client'

import { useAuth } from '@/lib/auth-context'
import { ChefHat, LogIn, RefreshCw, ShieldAlert, UserCheck } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// Dynamically import VendorDashboard with SSR disabled to guarantee ZERO hydration mismatches and ZERO reload loops
const VendorDashboard = dynamic(() => import('@/components/dashboards/VendorDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-[#18201c] dark:text-white uppercase tracking-wider">
          Initializing Kitchen Console...
        </p>
      </div>
    </div>
  ),
})

export default function VendorDashboardPage() {
  const [mounted, setMounted] = useState(false)
  const { user, role, isLoading, login } = useAuth()
  const [quickSigningIn, setQuickSigningIn] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isKitchenVendor = role === 'vendor' || role === 'restaurant_vendor' || role === 'admin'

  const handleQuickVendorLogin = async () => {
    try {
      setQuickSigningIn(true)
      setAuthError(null)
      await login('vendor@crave.com', 'Password123!')
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign in as vendor')
    } finally {
      setQuickSigningIn(false)
    }
  }

  // Identical clean placeholder on initial render to prevent SSR/CSR hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] dark:text-white uppercase tracking-wider">
            Loading Kitchen Console...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#fafbfa] dark:bg-[#0c120e]">
      {/* Non-intrusive Account Status Banner (No redirects, No reload loops) */}
      {!isLoading && !user && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/80 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <ChefHat className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">Kitchen Preview Mode:</span>
            <span>Viewing Crave Kitchen &amp; Gourmet Grills console.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickVendorLogin}
              disabled={quickSigningIn}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18201c] px-3 py-1 font-bold text-white transition hover:bg-black disabled:opacity-50 dark:bg-[#d9f447] dark:text-[#121815]"
            >
              {quickSigningIn ? (
                <>
                  <RefreshCw className="size-3 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <UserCheck className="size-3" />
                  <span>1-Click Sign In (vendor@crave.com)</span>
                </>
              )}
            </button>
            <Link
              href="/login?from=/vendor/dashboard"
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-100"
            >
              <LogIn className="size-3" />
              <span>Sign In Other</span>
            </Link>
          </div>
        </div>
      )}

      {!isLoading && user && !isKitchenVendor && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-900 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/80 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              Signed in as <strong className="capitalize">{user.name || user.email}</strong> (Role:{' '}
              {role}).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickVendorLogin}
              disabled={quickSigningIn}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18201c] px-3 py-1 font-bold text-white transition hover:bg-black disabled:opacity-50 dark:bg-[#d9f447] dark:text-[#121815]"
            >
              {quickSigningIn ? 'Switching...' : 'Switch to Kitchen Account'}
            </button>
            <Link
              href="/user/dashboard"
              className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white px-3 py-1 font-medium text-blue-950 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-100"
            >
              <span>Go to Customer App</span>
            </Link>
          </div>
        </div>
      )}

      {authError && (
        <div className="bg-rose-500 px-4 py-1.5 text-center text-xs font-semibold text-white">
          {authError}
        </div>
      )}

      {/* Main Vendor Console: Client-only dynamically loaded with zero hydration mismatch */}
      <VendorDashboard />
    </div>
  )
}
