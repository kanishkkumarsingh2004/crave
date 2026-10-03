'use client'

import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth, UserRole } from '@/lib/auth-context'
import { ArrowRight, Lock, Mail, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export default function LoginPage() {
  const { user, login, loginAsRole, logout, demoUsers } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your email address')
      return
    }
    const success = await login(email.trim(), selectedRole)
    if (success) {
      const targetPath =
        selectedRole === 'customer' ? '/user/dashboard' : `/${selectedRole}/dashboard`
      router.push(targetPath)
    }
  }

  async function handleDemoRoleClick(r: UserRole) {
    await loginAsRole(r)
    const targetPath = r === 'customer' ? '/user/dashboard' : `/${r}/dashboard`
    router.push(targetPath)
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto my-12 w-full max-w-md px-4">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xl sm:p-8">
          {/* Active Session Notification */}
          {user && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="font-bold text-amber-950">
                    Currently logged in as <span className="underline">{user.name}</span> (
                    {roleDetails[user.role]?.title || user.role})
                  </p>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Select a demo role below to switch accounts instantly, or sign out to use custom
                  credentials.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={user.role === 'customer' ? '/user/dashboard' : `/${user.role}/dashboard`}
                    className="rounded-xl bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#323d36]"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                      router.push('/login')
                    }}
                    className="rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto inline-grid size-12 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shadow-md">
              <Zap className="size-6 fill-current" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#18201c]">
              Welcome Back to <span className="text-[#7d9518]">crave.</span>
            </h1>
            <p className="mt-1 text-xs text-[#717c76]">
              Sign in to your account or pick a demo role to test.
            </p>
          </div>

          {/* Quick Demo Login Switcher */}
          <div className="mt-6 rounded-2xl border border-[#e1e6df] bg-[#f8f9f6] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#86948c] mb-2 text-center">
              ⚡ 1-Click Fast Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
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
                      <p className="text-[9px] text-gray-500 font-normal">
                        {demoUsers[r].name.split(' ')[0]}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* craveEP Store Console Demo Login Button */}
            <button
              type="button"
              onClick={async () => {
                await loginAsRole('vendor')
                router.push('/vendor/crave-ep')
              }}
              className="w-full flex items-center justify-between rounded-xl border border-emerald-600/40 bg-[#121815] p-2.5 text-white text-left text-xs font-bold shadow-md hover:bg-emerald-950 transition"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-[#d9f447] text-[#121815] font-black">
                  <Zap className="size-4 fill-current" />
                </span>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">craveEP Dark Store Manager</p>
                  <p className="text-[10px] text-emerald-300 font-medium">Instamart Inventory &amp; Orders Console</p>
                </div>
              </div>
              <span className="rounded-full bg-[#d9f447] px-2.5 py-1 text-[10px] font-black text-[#121815]">
                LOGIN →
              </span>
            </button>
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
              <label className="text-xs font-bold text-[#18201c] mb-1.5 block">
                Select Login Role
              </label>
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

          <div className="mt-6 text-center text-xs text-[#717c76]">
            Don't have an account yet?{' '}
            <Link href="/signup" className="font-bold text-[#7d9518] hover:underline">
              Sign Up for Free
            </Link>
          </div>

          {/* Quick Demo Credentials Cheatsheet */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs">
            <p className="font-bold text-[#18201c] mb-2">🔑 Demo Login Credentials (Password: any)</p>
            <div className="flex flex-col gap-1.5 text-[11px] text-gray-600 font-mono">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-bold text-emerald-800">craveEP Dark Store:</span>
                <span>craveep@crave.com</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-bold text-[#18201c]">Customer Account:</span>
                <span>alex@example.com</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-bold text-amber-900">Restaurant Vendor:</span>
                <span>green@table.com</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="font-bold text-blue-900">Delivery Driver:</span>
                <span>rajesh@express.com</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-purple-900">Platform Admin:</span>
                <span>admin@crave.com</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        © 2026 crave. Fast multi-role food delivery platform.
      </footer>
    </div>
  )
}
