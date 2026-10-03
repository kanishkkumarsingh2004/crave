'use client'

import VendorDashboard from '@/components/dashboards/VendorDashboard'
import { useAuth } from '@/lib/auth-context'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function VendorDashboardPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
    } else if (role !== 'vendor') {
      const redirectPath = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`
      router.replace(redirectPath)
    }
  }, [user, role, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Loading Kitchen Console...
          </p>
        </div>
      </div>
    )
  }

  if (role !== 'vendor') {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl border border-rose-200">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#18201c]">Access Denied</h2>
          <p className="mt-2 text-xs text-gray-600">
            You are logged in as <span className="font-bold capitalize">{role}</span>. Vendor
            Console is restricted to kitchen owners.
          </p>
          <button
            onClick={() =>
              router.push(role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`)
            }
            className="mt-6 rounded-full bg-[#18201c] px-6 py-2.5 text-xs font-bold text-white"
          >
            Go to Your {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <VendorDashboard />
}
