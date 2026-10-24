'use client'

import CraveLogo from '@/components/CraveLogo'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function getTargetDashboard(u: { role?: string; email?: string } | null): string {
  if (!u) return '/user/dashboard'
  if (u.role === 'cravexp_store_vendor') {
    return '/vendor/crave-ep'
  }
  switch (u.role) {
    case 'admin':
      return '/admin/dashboard'
    case 'restaurant_vendor':
    case 'vendor':
      return '/vendor/dashboard'
    case 'rider':
    case 'driver':
      return '/driver/dashboard'
    case 'user':
    case 'customer':
    default:
      return '/user/dashboard'
  }
}

export default function LoginPage() {
  const { login, user, role, isLoading, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-redirect if already authenticated (unless explicit logout requested)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.search.includes('logout') || window.location.search.includes('switch'))
    ) {
      return
    }
    if (!isLoading && user) {
      const destination = getTargetDashboard(user)
      window.location.replace(destination)
    }
  }, [user, isLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setErrorMsg('Please enter your email address')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const authenticatedUser = await login(email.trim(), password)
      if (authenticatedUser) {
        const targetPath = getTargetDashboard(authenticatedUser)
        window.location.replace(targetPath)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Email or password is incorrect.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#121815] dark:text-stone-100 flex flex-col justify-between relative selection:bg-[#d9f447] selection:text-[#121815]">
      {/* Ambient Glow & Dot Grid */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[480px] w-full max-w-4xl bg-gradient-to-b from-[#d9f447]/10 via-[#d9f447]/5 to-transparent blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.02] dark:opacity-[0.03]" />

      <Navbar />

      <main className="mx-auto my-8 sm:my-14 w-full max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Branding (Desktop) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] leading-[1.05] text-[#121815] dark:text-white">
              Welcome back. <br />
              <span className="font-serif italic font-normal text-stone-500 dark:text-stone-400">
                Sign in to Crave.
              </span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
              Order delicious food, track active deliveries in real time, or manage your restaurant and courier operations.
            </p>

            {/* Practical Service Highlights */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5 dark:border-white/10 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-2 font-medium justify-center lg:justify-start">
                <ShieldCheck className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <span>Verified Partners</span>
              </div>
              <div className="flex items-center gap-2 font-medium justify-center lg:justify-start">
                <Sparkles className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <span>Live GPS Tracking</span>
              </div>
            </div>
          </div>

          {/* Right Frosted Glass Authentication Console */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#141b17]/90 p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all">
              {/* Console Header */}
              <div className="flex items-center justify-between pb-6 border-b border-black/5 dark:border-white/10">
                <div>
                  <CraveLogo variant="full" size="md" />
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                    Sign in to your account
                  </p>
                </div>
                <div className="size-9 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                  <Lock className="size-4 text-[#5e8210] dark:text-[#d9f447]" />
                </div>
              </div>

              {/* Already Authenticated State */}
              {user ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-[#d9f447]/30 bg-[#d9f447]/10 dark:bg-[#d9f447]/5 p-5 backdrop-blur-md space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#5e8210] dark:text-[#d9f447]">
                      <ShieldCheck className="size-4" />
                      <span>Active Session Detected</span>
                    </div>
                    <p className="text-sm font-bold text-[#121815] dark:text-white">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                      {user.email} • <span className="capitalize font-sans font-bold">{role}</span>
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-300 pt-1">
                      You are already signed in. Redirecting to your dashboard...
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.replace(getTargetDashboard(user))
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#d9f447] py-3.5 px-6 text-xs font-black text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90 active:scale-[0.99] shadow-md hover:shadow-xl"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-black/10 dark:border-white/10 py-3 px-6 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <span>Sign Out / Switch Account</span>
                  </button>
                </div>
              ) : (
                /* Login Form */
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {errorMsg && (
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2.5 backdrop-blur-md">
                      <ShieldAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Mail className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                      <span>Email Address</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Lock className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 pr-11 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#d9f447] py-3.5 px-6 text-xs font-black text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90 active:scale-[0.99] shadow-md hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Registration Link */}
              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 text-center text-xs text-stone-500 dark:text-stone-400">
                <span>Don&apos;t have an account yet? </span>
                <Link
                  href="/signup"
                  className="font-bold text-[#121815] dark:text-[#d9f447] underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-stone-400 dark:text-stone-600 border-t border-black/5 dark:border-white/5">
        <p className="font-mono tracking-wider">
          © 2026 CRAVE • BENGALURU, INDIA
        </p>
      </footer>
    </div>
  )
}
