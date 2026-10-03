'use client'

import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, Lock, Mail, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export default function LoginPage() {
  const { user, login, logout } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your email address')
      return
    }
    const authenticatedUser = await login(email.trim(), password)
    if (authenticatedUser) {
      const targetPath =
        authenticatedUser.role === 'customer'
          ? '/user/dashboard'
          : `/${authenticatedUser.role}/dashboard`
      router.push(targetPath)
    } else {
      setErrorMsg('Email or password is incorrect.')
    }
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
                  You already have an active account session.
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
            <p className="mt-1 text-xs text-[#717c76]">Sign in to your account.</p>
          </div>

          {/* Regular Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        © 2026 crave. Fast multi-role food delivery platform.
      </footer>
    </div>
  )
}
