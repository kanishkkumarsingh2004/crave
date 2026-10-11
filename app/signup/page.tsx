'use client'

import CraveLogo from '@/components/CraveLogo'
import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export default function SignupPage() {
  const { user, signup, logout } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)

    try {
      const res = await signup({
        name: name.trim(),
        email: email.trim(),
        role: 'user',
        password,
        phone: phone.trim(),
      })

      if (res && !res.success) {
        setErrorMsg(res.message || 'Unable to complete registration.')
        return
      }

      router.push('/user/dashboard')
    } catch {
      setErrorMsg('An unexpected error occurred during registration.')
    } finally {
      setSubmitting(false)
    }
  }

  const passwordsMatch = password.length > 0 && password === confirmPassword

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#121815] dark:text-stone-100 flex flex-col justify-between relative selection:bg-[#d9f447] selection:text-[#121815]">
      {/* Ambient High-Fashion Glow & Dot Grid */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[560px] w-full max-w-5xl bg-gradient-to-b from-[#d9f447]/15 via-[#d9f447]/5 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.03] dark:opacity-[0.04]" />

      <Navbar />

      <main className="mx-auto my-8 sm:my-14 w-full max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Editorial Column (Desktop) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-stone-500 dark:text-stone-400">
              <span className="size-1.5 rounded-full bg-[#5e8210] dark:bg-[#d9f447]" />
              <span>Membership Registration</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] leading-[1.05] text-[#121815] dark:text-white">
              Join the epicurean circle. <br />
              <span className="font-serif italic font-normal text-stone-500 dark:text-stone-400">
                Crafted for connoisseurs.
              </span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
              Create your complimentary patron profile to access secret menu drops, direct kitchen dispatching, and doorstep delivery in under 25 minutes.
            </p>

            {/* Value Pillars */}
            <div className="pt-2 space-y-3 max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <Clock className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <div className="text-xs text-left">
                  <p className="font-bold text-[#121815] dark:text-white">25-Minute Priority Dispatch</p>
                  <p className="text-stone-500 dark:text-stone-400">Strict temperature-controlled delivery</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <Flame className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <div className="text-xs text-left">
                  <p className="font-bold text-[#121815] dark:text-white">Verified Artisan Hearths</p>
                  <p className="text-stone-500 dark:text-stone-400">Award-winning sourdough, biryani &amp; grills</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <Sparkles className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <div className="text-xs text-left">
                  <p className="font-bold text-[#121815] dark:text-white">Zero Inflated Markups</p>
                  <p className="text-stone-500 dark:text-stone-400">Original restaurant dine-in pricing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Frosted Glass Registration Console */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#141b17]/90 p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all">
              {/* Active Session Notification */}
              {user && (
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
                      Submitting this form will register a new patron profile.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href="/user/dashboard"
                        className="rounded-xl bg-[#121815] dark:bg-[#d9f447] px-3.5 py-1.5 text-xs font-bold text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90"
                      >
                        Open Workspace
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await logout()
                          router.push('/signup')
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
                    Sign up as a customer to begin dining
                  </p>
                </div>
                <div className="size-9 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-black/5 dark:border-white/5">
                  <User className="size-4 text-[#5e8210] dark:text-[#d9f447]" />
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {errorMsg && (
                  <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2.5 backdrop-blur-md">
                    <ShieldAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <User className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Lin"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Phone className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                      <span>Mobile Number</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Mail className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                  />
                </div>

                {/* Passwords Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                        <Lock className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                        <span>Confirm Password</span>
                      </label>
                      {passwordsMatch && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-[#d9f447]">
                          <CheckCircle2 className="size-3" />
                          <span>Matched</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 pr-11 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none transition-all focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#d9f447] py-3.5 px-6 text-xs font-black text-[#d9f447] dark:text-[#121815] transition-all hover:opacity-90 active:scale-[0.99] shadow-md hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating Patron Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/10 text-center text-xs text-stone-500 dark:text-stone-400">
                <span>Already have an account? </span>
                <Link
                  href="/login"
                  className="font-bold text-[#121815] dark:text-[#d9f447] underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Sign In instead
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
