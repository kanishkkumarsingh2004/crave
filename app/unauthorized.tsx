'use client'

import Link from 'next/link'
import { Clock, Home, LogIn, ShoppingBag, UtensilsCrossed } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#18201c] text-[#f8f9f7] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-amber-500/5 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 size-[400px] rounded-full bg-[#d9f447]/3 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <UtensilsCrossed className="size-12 text-[#d9f447]" />
          <span className="text-6xl font-black tracking-tight">
            crave<span className="text-[#d9f447]">.</span>
          </span>
        </div>

        <div className="mb-10">
          <Clock className="size-20 text-amber-400 mx-auto" />
        </div>

        <h1 className="text-3xl font-extrabold text-white sm:text-4xl mb-3">
          Authentication Required
        </h1>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-10">
          You need to log in to access this page. Sign in with your Crave account or continue
          exploring as a guest.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#d9f447] px-6 py-3 text-sm font-extrabold text-[#18201c] transition hover:bg-[#c8e434] hover:scale-105 active:scale-95 shadow-2xl"
          >
            <LogIn className="size-4" />
            Log In
          </Link>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-bold text-gray-200 transition hover:bg-gray-700"
          >
            Sign Up
          </Link>

          <Link
            href="/user/explore"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-bold text-gray-200 transition hover:bg-gray-700"
          >
            <ShoppingBag className="size-4 text-amber-400" />
            Browse Food
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-bold text-gray-200 transition hover:bg-gray-700"
          >
            <Home className="size-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
