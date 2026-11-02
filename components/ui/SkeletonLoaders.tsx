'use client'

import React from 'react'

/**
 * Base atomic pulsing skeleton element
 */
export function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={style}
      className={`animate-pulse bg-stone-200/80 dark:bg-white/[0.07] ${className}`}
    />
  )
}

/**
 * Customer Navigation Bar Skeleton
 */
export function NavbarSkeleton() {
  return (
    <div className="w-full border-b border-stone-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c120e]/80 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
        {/* Left: Logo & Location */}
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
          <div className="hidden sm:flex items-center gap-2">
            <SkeletonBlock className="size-8 rounded-full" />
            <div className="space-y-1">
              <SkeletonBlock className="h-3 w-16 rounded" />
              <SkeletonBlock className="h-3.5 w-36 rounded" />
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:block flex-1 max-w-md">
          <SkeletonBlock className="h-10 w-full rounded-full" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-20 rounded-full hidden sm:block" />
          <SkeletonBlock className="size-9 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Full Customer Dashboard / Explore Skeleton Loader
 * Replaces generic spinner with actual layout preview (Header, Banners, Categories, Food Grid)
 */
export function CustomerDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24 selection:bg-[#d9f447] selection:text-[#121815]">
      {/* Header */}
      <NavbarSkeleton />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-6 sm:pt-6 space-y-8">
        {/* Hero Carousel Banner Skeleton */}
        <div className="relative w-full h-44 sm:h-64 lg:h-72 rounded-3xl overflow-hidden border border-stone-200/70 dark:border-white/5">
          <SkeletonBlock className="size-full" />
          <div className="absolute bottom-6 left-6 space-y-2 max-w-md">
            <SkeletonBlock className="h-4 w-28 rounded-md bg-stone-300 dark:bg-white/15" />
            <SkeletonBlock className="h-7 w-3/4 rounded-xl bg-stone-300 dark:bg-white/15" />
            <SkeletonBlock className="h-3.5 w-1/2 rounded-md bg-stone-300 dark:bg-white/15" />
          </div>
        </div>

        {/* Food Categories Circles/Pills Row Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-36 rounded-md" />
            <SkeletonBlock className="h-4 w-16 rounded-md hidden sm:block" />
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="flex shrink-0 flex-col items-center gap-2">
                <SkeletonBlock className="size-16 sm:size-20 rounded-full" />
                <SkeletonBlock className="h-3 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Filter Pills Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-20 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-32 rounded-full hidden sm:block" />
        </div>

        {/* Signature Kitchens / Restaurants Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-6 w-48 rounded-lg" />
            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
              <div
                key={card}
                className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-3.5 space-y-3 shadow-xs"
              >
                {/* Restaurant Image Skeleton */}
                <div className="relative h-44 w-full rounded-2xl overflow-hidden">
                  <SkeletonBlock className="size-full" />
                  <div className="absolute top-2.5 left-2.5">
                    <SkeletonBlock className="h-5 w-16 rounded-full bg-white/40 dark:bg-black/40" />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <SkeletonBlock className="h-5 w-3/5 rounded-md" />
                    <SkeletonBlock className="h-5 w-12 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3.5 w-4/5 rounded" />
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-white/5">
                    <SkeletonBlock className="h-4 w-20 rounded" />
                    <SkeletonBlock className="h-4 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Live Order / Track Order Skeleton Loader
 */
export function LiveOrderSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <NavbarSkeleton />
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 space-y-6">
        {/* Header ETA banner */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-white/5 pb-4">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-48 rounded-xl" />
              <SkeletonBlock className="h-3.5 w-64 rounded" />
            </div>
            <SkeletonBlock className="h-10 w-36 rounded-2xl" />
          </div>

          {/* Stepper Progress Skeleton */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <SkeletonBlock className="size-8 rounded-full" />
                <SkeletonBlock className="h-2.5 w-16 rounded hidden sm:block" />
              </div>
            ))}
          </div>
        </div>

        {/* Map & Rider info 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map View Skeleton */}
          <div className="lg:col-span-2 h-[380px] sm:h-[450px] rounded-3xl overflow-hidden border border-stone-200/80 dark:border-white/5">
            <SkeletonBlock className="size-full" />
          </div>

          {/* Rider & Delivery Summary Skeleton */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="size-12 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <SkeletonBlock className="h-4 w-28 rounded" />
                  <SkeletonBlock className="h-3 w-20 rounded" />
                </div>
                <SkeletonBlock className="size-10 rounded-full" />
              </div>

              {/* OTP Pill */}
              <div className="rounded-2xl border border-stone-200/60 dark:border-white/5 p-3.5 flex items-center justify-between">
                <div className="space-y-1">
                  <SkeletonBlock className="h-2.5 w-16 rounded" />
                  <SkeletonBlock className="h-6 w-24 rounded-md" />
                </div>
                <SkeletonBlock className="h-8 w-20 rounded-xl" />
              </div>
            </div>

            {/* Order Items List Skeleton */}
            <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-5 space-y-3 shadow-sm">
              <SkeletonBlock className="h-4 w-32 rounded" />
              <div className="space-y-2 pt-2 divide-y divide-stone-100 dark:divide-white/5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between pt-2">
                    <SkeletonBlock className="h-3.5 w-36 rounded" />
                    <SkeletonBlock className="h-3.5 w-12 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Customer Orders History Skeleton Loader
 */
export function OrdersListSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <NavbarSkeleton />
      <main className="mx-auto w-full max-w-[1000px] px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <SkeletonBlock className="h-7 w-36 rounded-xl" />
            <SkeletonBlock className="h-3.5 w-48 rounded" />
          </div>
        </div>

        {/* Order Cards List */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-5 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-4 border-b border-stone-100 dark:border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="size-12 rounded-2xl" />
                  <div className="space-y-1.5">
                    <SkeletonBlock className="h-4 w-36 rounded" />
                    <SkeletonBlock className="h-3 w-24 rounded" />
                  </div>
                </div>
                <SkeletonBlock className="h-6 w-24 rounded-full" />
              </div>

              <div className="space-y-1.5 py-1">
                <SkeletonBlock className="h-3.5 w-3/4 rounded" />
                <SkeletonBlock className="h-3.5 w-1/2 rounded" />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-white/5">
                <SkeletonBlock className="h-5 w-20 rounded" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-9 w-24 rounded-full" />
                  <SkeletonBlock className="h-9 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Customer Profile Skeleton Loader
 */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <NavbarSkeleton />
      <main className="mx-auto w-full max-w-[800px] px-4 pt-6 space-y-6">
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-stone-100 dark:border-white/5 pb-6">
            <SkeletonBlock className="size-16 sm:size-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-6 w-44 rounded-lg" />
              <SkeletonBlock className="h-3.5 w-32 rounded" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-3 w-20 rounded" />
              <SkeletonBlock className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <SkeletonBlock className="h-3 w-20 rounded" />
              <SkeletonBlock className="h-11 w-full rounded-2xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-24 rounded" />
            <SkeletonBlock className="h-20 w-full rounded-2xl" />
          </div>

          <div className="pt-2">
            <SkeletonBlock className="h-11 w-36 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Customer Cart Skeleton Loader
 */
export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <NavbarSkeleton />
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 space-y-6">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart items list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
                <SkeletonBlock className="h-5 w-40 rounded" />
                <SkeletonBlock className="h-4 w-16 rounded" />
              </div>

              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="size-14 rounded-2xl" />
                    <div className="space-y-1.5">
                      <SkeletonBlock className="h-4 w-32 rounded" />
                      <SkeletonBlock className="h-3 w-20 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-8 w-24 rounded-full" />
                    <SkeletonBlock className="h-4 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill details */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 shadow-sm space-y-3">
              <SkeletonBlock className="h-5 w-28 rounded" />
              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-3.5 w-24 rounded" />
                  <SkeletonBlock className="h-3.5 w-14 rounded" />
                </div>
                <div className="flex justify-between">
                  <SkeletonBlock className="h-3.5 w-28 rounded" />
                  <SkeletonBlock className="h-3.5 w-14 rounded" />
                </div>
                <div className="flex justify-between">
                  <SkeletonBlock className="h-3.5 w-20 rounded" />
                  <SkeletonBlock className="h-3.5 w-14 rounded" />
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-100 dark:border-white/5">
                  <SkeletonBlock className="h-5 w-24 rounded" />
                  <SkeletonBlock className="h-5 w-16 rounded" />
                </div>
              </div>
              <div className="pt-3">
                <SkeletonBlock className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Customer Help & Support Skeleton Loader
 */
export function HelpSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <NavbarSkeleton />
      <main className="mx-auto w-full max-w-[900px] px-4 pt-8 space-y-8">
        <div className="text-center space-y-2">
          <SkeletonBlock className="h-8 w-48 rounded-xl mx-auto" />
          <SkeletonBlock className="h-4 w-72 rounded mx-auto" />
        </div>
        <SkeletonBlock className="h-12 w-full max-w-md mx-auto rounded-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 text-center space-y-3 shadow-sm"
            >
              <SkeletonBlock className="size-12 rounded-2xl mx-auto" />
              <SkeletonBlock className="h-4 w-28 rounded mx-auto" />
              <SkeletonBlock className="h-3 w-36 rounded mx-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Vendor Dashboard & Operations Skeleton Loader
 */
export function VendorDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] pb-24 lg:pl-64">
      {/* Top Header */}
      <div className="border-b border-stone-200 dark:border-[#202b24] bg-white dark:bg-[#0e1411] px-4 py-4 sm:px-8 flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonBlock className="h-6 w-44 rounded-lg" />
          <SkeletonBlock className="h-3 w-64 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-28 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 space-y-8">
        {/* KPI Metrics 4 Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((c) => (
            <div
              key={c}
              className="rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-5 space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3 w-20 rounded" />
                <SkeletonBlock className="size-8 rounded-xl" />
              </div>
              <SkeletonBlock className="h-7 w-28 rounded-md" />
              <SkeletonBlock className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Live Kitchen Tickets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40 rounded" />
            <SkeletonBlock className="h-4 w-20 rounded" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((ticket) => (
              <div
                key={ticket}
                className="rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
                  <div className="space-y-1">
                    <SkeletonBlock className="h-4 w-24 rounded" />
                    <SkeletonBlock className="h-3 w-16 rounded" />
                  </div>
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="h-3.5 w-full rounded" />
                  <SkeletonBlock className="h-3.5 w-3/4 rounded" />
                </div>
                <div className="pt-2 flex gap-2">
                  <SkeletonBlock className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Vendor Menu Catalog Skeleton Loader
 */
export function VendorMenuSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] pb-24 lg:pl-64">
      <div className="border-b border-stone-200 dark:border-[#202b24] bg-white dark:bg-[#0e1411] px-4 py-4 sm:px-8 flex items-center justify-between">
        <div className="space-y-1">
          <SkeletonBlock className="h-6 w-36 rounded-lg" />
          <SkeletonBlock className="h-3 w-56 rounded" />
        </div>
        <SkeletonBlock className="h-9 w-32 rounded-full" />
      </div>

      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Search & Categories Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <SkeletonBlock className="h-10 w-full sm:w-72 rounded-full" />
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-4 space-y-3 shadow-xs"
            >
              <SkeletonBlock className="h-40 w-full rounded-2xl" />
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-4 w-32 rounded" />
                  <SkeletonBlock className="h-4 w-12 rounded" />
                </div>
                <SkeletonBlock className="h-3 w-44 rounded" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-white/5">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <div className="flex gap-1.5">
                  <SkeletonBlock className="size-7 rounded-lg" />
                  <SkeletonBlock className="size-7 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Driver Dashboard & Tasks Skeleton Loader
 */
export function DriverDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      {/* Driver Header */}
      <div className="border-b border-stone-200 dark:border-white/10 bg-white dark:bg-[#111713] px-4 py-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-10 rounded-full" />
          <div className="space-y-1">
            <SkeletonBlock className="h-4 w-28 rounded" />
            <SkeletonBlock className="h-3 w-20 rounded" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-28 rounded-full" />
      </div>

      <main className="mx-auto w-full max-w-[1000px] px-4 pt-6 space-y-6">
        {/* Earnings banner */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3.5 w-24 rounded" />
            <SkeletonBlock className="h-7 w-32 rounded-lg" />
          </div>
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
        </div>

        {/* Live Delivery / Available Orders Card */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
            <SkeletonBlock className="h-5 w-36 rounded" />
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>

          <div className="h-44 w-full rounded-2xl overflow-hidden">
            <SkeletonBlock className="size-full" />
          </div>

          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-3/4 rounded" />
            <SkeletonBlock className="h-3.5 w-1/2 rounded" />
          </div>

          <div className="pt-2 flex gap-3">
            <SkeletonBlock className="h-11 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Admin Dashboard & Reports Skeleton Loader
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-24">
      <div className="border-b border-stone-200 dark:border-white/10 bg-white dark:bg-[#111713] px-4 py-4 sm:px-8 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-36 rounded-lg" />
        <SkeletonBlock className="size-8 rounded-full" />
      </div>

      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((c) => (
            <div
              key={c}
              className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-5 space-y-2 shadow-xs"
            >
              <SkeletonBlock className="h-3 w-20 rounded" />
              <SkeletonBlock className="h-7 w-24 rounded-md" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
            <SkeletonBlock className="h-5 w-32 rounded" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-white/5"
              >
                <SkeletonBlock className="h-4 w-36 rounded" />
                <SkeletonBlock className="h-4 w-24 rounded" />
                <SkeletonBlock className="h-4 w-16 rounded" />
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Interactive Map Loading Skeleton
 */
export function MapSkeleton({
  className = 'h-[calc(100vh-200px)] min-h-[600px]',
}: {
  className?: string
}) {
  return (
    <div
      className={`w-full rounded-2xl bg-stone-100 dark:bg-[#121a14] border border-stone-200 dark:border-white/10 relative overflow-hidden flex flex-col justify-between p-6 ${className}`}
    >
      {/* Top Map Controls Skeleton */}
      <div className="flex items-center justify-between z-10">
        <SkeletonBlock className="h-10 w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="size-9 rounded-lg" />
          <SkeletonBlock className="size-9 rounded-lg" />
        </div>
      </div>

      {/* Simulated Pulsing Map Nodes */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/3 size-6 rounded-full bg-[#d9f447]/50 animate-ping" />
        <div className="absolute top-1/2 left-2/3 size-6 rounded-full bg-emerald-400/50 animate-ping delay-200" />
        <div className="absolute bottom-1/3 left-1/2 size-6 rounded-full bg-cyan-400/50 animate-ping delay-500" />
        <div className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#27342d_1px,transparent_1px)]" />
      </div>

      {/* Bottom Telemetry Card Skeleton */}
      <div className="z-10 bg-white/80 dark:bg-[#18201c]/80 backdrop-blur-md rounded-2xl p-4 max-w-sm border border-stone-200/80 dark:border-white/10 space-y-2">
        <SkeletonBlock className="h-3 w-28 rounded" />
        <SkeletonBlock className="h-5 w-48 rounded" />
      </div>
    </div>
  )
}
