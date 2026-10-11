'use client'

import CraveLogo from '@/components/CraveLogo'
import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth, UserRole } from '@/lib/auth-context'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

interface QuickRole {
  id: string
  label: string
  email: string
  pass: string
  role: string
  icon: React.ElementType
}

const QUICK_ROLES: QuickRole[] = [
  { id: 'user', label: 'Customer', email: 'user@crave.com', pass: '1234567890', role: 'Epicurean Patron', icon: User },
  { id: 'vendor', label: 'Kitchen Chef', email: 'vendor@crave.com', pass: '1234567890', role: 'Master Hearth', icon: UtensilsCrossed },
  { id: 'driver', label: 'Courier Rider', email: 'rider@crave.com', pass: '1234567890', role: 'Dispatch Fleet', icon: Bike },
  { id: 'darkstore', label: 'CraveXP Store', email: 'darkstore@crave.com', pass: '1234567890', role: 'Dark Store', icon: Store },
  { id: 'admin', label: 'Administrator', email: 'admin@crave.com', pass: '1234567890', role: 'Command Center', icon: ShieldCheck },
]

export default function LoginPage() {
  const { user, login, logout } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleSelectQuickRole(r: QuickRole) {
    setEmail(r.email)
    setPassword(r.pass)
    setSelectedRole(r.id)
    setErrorMsg('')
  }

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
        const isCraveXPStore =
          authenticatedUser.email === 'cravexp@crave.com' ||
          authenticatedUser.email === 'store@crave.com'
        const targetPath =
          isCraveXPStore || authenticatedUser.role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : authenticatedUser.role === 'user' || authenticatedUser.role === 'customer'
              ? '/user/dashboard'
              : authenticatedUser.role === 'restaurant_vendor' || authenticatedUser.role === 'vendor'
                ? '/vendor/dashboard'
                : authenticatedUser.role === 'rider' || authenticatedUser.role === 'driver'
                  ? '/driver/dashboard'
                  : authenticatedUser.role === 'admin'
                    ? '/admin/dashboard'
                    : '/dashboard'
        router.push(targetPath)
      } else {
        setErrorMsg('Email or password is incorrect.')
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#121815] dark:text-stone-100 flex flex-col justify-between relative selection:bg-[#d9f447] selection:text-[#121815]">
      {/* Ambient High-Fashion Glow & Dot Grid */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[560px] w-full max-w-5xl bg-gradient-to-b from-[#d9f447]/15 via-[#d9f447]/5 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03] dark:opacity-[0.04]" />

      <Navbar />

      <main className="mx-auto my-8 sm:my-14 w-full max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Editorial Branding (Desktop) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-stone-500 dark:text-stone-400">
              <span className="size-1.5 rounded-full bg-[#5e8210] dark:bg-[#d9f447]" />
              <span>Private Access Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] leading-[1.05] text-[#121815] dark:text-white">
              Gastronomic mastery. <br />
              <span className="font-serif italic font-normal text-stone-500 dark:text-stone-400">
                At your command.
              </span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
              Sign in to orchestrate artisan culinary deliveries, inspect live hearth queues, or manage South Bengaluru&apos;s finest kitchens.
            </p>

            {/* Quick Demo Switcher Container */}
            <div className="pt-2">
              <div className="text-[11px] font-mono tracking-wider uppercase text-stone-400 dark:text-stone-500 mb-3 flex items-center justify-center lg:justify-start gap-1.5">
                <KeyRound className="size-3 text-[#5e8210] dark:text-[#d9f447]" />
                <span>Instant Demo Persona Switcher</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {QUICK_ROLES.map((r) => {
                  const Icon = r.icon
                  const isActive = selectedRole === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectQuickRole(r)}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 border ${
                        isActive
                          ? 'border-[#121815] dark:border-[#d9f447] bg-[#121815] text-[#d9f447] dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                          : 'border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:border-black/25 dark:hover:border-white/25 hover:bg-white dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`size-3.5 ${isActive ? 'text-[#d9f447] dark:text-[#121815]' : 'text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200'}`} />
                      <span>{r.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Editorial Provenance Accents */}
            <div className="hidden lg:grid grid-cols-2 gap-4 pt-6 border-t border-black/5 dark:border-white/10 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <span>256-bit encryption</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <span>Zero surcharge</span>
              </div>
            </div>
          </div>

          {/* Right Frosted Glass Authentication Console */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#141b17]/90 p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all">
              {/* Active Session Notification */}
              {user && mounted && (
                <div className="mb-6 rounded-2xl border border-amber-300/60 dark:border-amber-600/30 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-xs backdrop-blur-md">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      <p className="font-bold text-amber-950 dark:text-amber-200">
                        Active session: <span className="underline">{user.name}</span> (
                        {roleDetails[user.role]?.title || user.role})
                      </p>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      You are already authenticated. You can return directly to your workspace or switch accounts below.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href="/dashboard"
                        className="rounded-xl bg-[#121815] dark:bg-[#d9f447] px-3.5 py-1.5 text-xs font-bold text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90"
                      >
                        Open Workspace
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await logout()
                          router.push('/login')
                        }}
                        className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-black/30 px-3.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Console Header */}
              <div className="flex items-center justify-between pb-6 border-b border-black/5 dark:border-white/10">
                <div>
                  <CraveLogo variant="full" size="md" />
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                    Sign in to your private Crave account
                  </p>
                </div>
                <div className="size-9 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                  <Lock className="size-4 text-[#5e8210] dark:text-[#d9f447]" />
                </div>
              </div>

              {/* Login Form */}
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
                      placeholder="e.g. user@crave.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setSelectedRole(null)
                      }}
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
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Crave Workspace</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Registration Link */}
              <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/10 text-center text-xs text-stone-500 dark:text-stone-400">
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

      {/* Editorial Footer */}
      <footer className="py-6 text-center text-xs text-stone-400 dark:text-stone-600 border-t border-black/5 dark:border-white/5">
        <p className="font-mono tracking-wider">
          © 2026 CRAVE GASTRONOMY • DISPATCH PROTOCOL 25-MIN • BANGALORE
        </p>
      </footer>
    </div>
  )
}
