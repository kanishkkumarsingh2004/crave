'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
} from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'
import Navbar, { roleDetails } from '@/components/Navbar'

export default function LoginPage() {
  const { login, loginAsRole, demoUsers } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer')
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your email address')
      return
    }
    login(email.trim(), selectedRole)
    router.push('/dashboard')
  }

  function handleDemoRoleClick(r: UserRole) {
    loginAsRole(r)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto my-12 w-full max-w-md px-4">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xl sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto inline-grid size-12 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shadow-md">
              <Zap className="size-6 fill-current" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#18201c]">
              Welcome Back to <span className="text-[#7d9518]">drop.</span>
            </h1>
            <p className="mt-1 text-xs text-[#717c76]">
              Sign in to your account or pick a demo role to test.
            </p>
          </div>

          {/* Quick Demo Login Switcher */}
          <div className="mt-6 rounded-2xl border border-[#e1e6df] bg-[#f8f9f6] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#86948c] mb-2 text-center">
              ⚡ 1-Click Fast Demo Login (4 Roles)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(roleDetails) as UserRole[]).map((r) => {
                const info = roleDetails[r]
                const IconComponent = info.icon
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleDemoRoleClick(r)}
                    className="flex items-center gap-2 rounded-xl border border-[#dfe4dc] bg-white p-2.5 text-left text-xs font-bold transition hover:border-[#a1b723] hover:bg-[#f3f7ea]"
                  >
                    <span className={`grid size-7 place-items-center rounded-lg ${info.bg}`}>
                      <IconComponent className={`size-3.5 ${info.color}`} />
                    </span>
                    <div>
                      <p className="capitalize text-[11px] leading-tight">{info.title}</p>
                      <p className="text-[9px] text-gray-500 font-normal">{demoUsers[r].name.split(' ')[0]}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-[10px] uppercase font-bold text-gray-400">Or custom login</span>
            <hr className="flex-1 border-gray-200" />
          </div>

          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-semibold border border-rose-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                <Mail className="size-3.5 text-[#7e9619]" /> Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] bg-[#fcfdfe] px-4 py-2.5 text-xs outline-none focus:border-[#8fa71c] focus:ring-2 focus:ring-[#d9f447]/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                <Lock className="size-3.5 text-[#7e9619]" /> Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] bg-[#fcfdfe] px-4 py-2.5 text-xs outline-none focus:border-[#8fa71c] focus:ring-2 focus:ring-[#d9f447]/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18201c] mb-1.5 block">Select Login Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-[#dfe4dc] bg-white px-3.5 py-2.5 text-xs outline-none font-medium"
              >
                <option value="customer">👤 Customer / User</option>
                <option value="vendor">🏪 Vendor (Restaurant Owner)</option>
                <option value="driver">🛵 Driver (Delivery Fleet)</option>
                <option value="admin">🛡️ Platform Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
            >
              Sign In to Dashboard <ArrowRight className="size-3.5" />
            </button>
          </form>

          {/* Footer link to signup */}
          <div className="mt-6 text-center text-xs text-[#717c76]">
            Don't have an account yet?{' '}
            <Link href="/signup" className="font-bold text-[#7d9518] hover:underline">
              Sign Up for Free
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        © 2026 drop. Fast multi-role food delivery platform.
      </footer>
    </div>
  )
}
