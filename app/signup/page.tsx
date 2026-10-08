'use client'

import CraveLogo from '@/components/CraveLogo'

import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    const res = await signup({
      name,
      email,
      role: 'user',
      password,
      phone,
    })

    if (res && !res.success) {
      setErrorMsg(res.message || 'Unable to complete registration.')
      return
    }

    router.push('/user/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto my-10 w-full max-w-xl px-4">
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
                  Submitting this form will register and log you into a new account.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href="/user/dashboard"
                    className="rounded-xl bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#323d36]"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                      router.push('/signup')
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
            <div className="mb-2">
              <CraveLogo variant="full" size="lg" />
            </div>
            <p className="text-xs font-medium text-[#717c76]">
              Sign up as a customer to start ordering from the best kitchens around.
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 font-semibold border border-rose-200">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <User className="size-3.5 text-[#7e9619]" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Mail className="size-3.5 text-[#7e9619]" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Phone className="size-3.5 text-[#7e9619]" /> Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Lock className="size-3.5 text-[#7e9619]" /> Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe4dc] bg-[#fcfdfe] px-4 py-2.5 pr-10 text-xs outline-none focus:border-[#8fa71c] focus:ring-2 focus:ring-[#d9f447]/50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-[#717c76] hover:text-[#18201c] hover:bg-[#f0f3eb] rounded-r-xl"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Lock className="size-3.5 text-[#7e9619]" /> Confirm Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe4dc] bg-[#fcfdfe] px-4 py-2.5 pr-10 text-xs outline-none focus:border-[#8fa71c] focus:ring-2 focus:ring-[#d9f447]/50"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-[#717c76] hover:text-[#18201c] hover:bg-[#f0f3eb] rounded-r-xl"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
            >
              Complete Registration <ArrowRight className="size-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#717c76]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#b5de28] hover:underline">
              Log In
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
