'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import CustomerDashboard from '@/components/dashboards/CustomerDashboard'
import { ShieldAlert } from 'lucide-react'

export default function UserDashboardPage() {
  const { user, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && role !== 'customer') {
      router.replace(`/${role}/dashboard`)
    }
  }, [user, role, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Authentication Required</p>
          <p className="mt-2 text-sm font-semibold">Loading user dashboard...</p>
        </div>
      </div>
    )
  }

  if (role !== 'customer') {
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
            onClick={() => router.push(`/${role}/dashboard`)}
            className="mt-6 rounded-full bg-[#18201c] px-6 py-2.5 text-xs font-bold text-white"
          >
            Go to {role} Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7]">
      <Navbar />
      <main>
        <CustomerDashboard />
      </main>
    </div>
  )
}
