'use client'

import React from 'react'

/**
 * Apple-grade Shimmer Skeleton components for zero-jump page transitions.
 * Replaces full-screen blocking preloaders and spinners with responsive structural skeletons.
 */

export function SkeletonNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0c100e]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 sm:w-24 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="hidden lg:flex items-center gap-2 rounded-full p-1 bg-black/[0.03] dark:bg-white/[0.05]">
          <div className="h-8 w-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 sm:w-36 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="size-8 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
      </div>
    </header>
  )
}

export function ExploreSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#18201c] dark:text-white">
      <SkeletonNavbar />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Location Bar Skeleton */}
        <div className="rounded-[28px] p-3 sm:p-4 bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="h-11 w-full sm:w-64 rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-11 flex-1 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-11 w-full sm:w-28 rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>

        {/* Cuisines Circles Row Skeleton */}
        <div className="flex items-center gap-4 sm:gap-6 overflow-hidden py-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <div className="size-16 sm:size-18 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-3 w-12 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Section Heading Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-44 rounded-lg bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-4 w-20 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>

        {/* Restaurant Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[28px] overflow-hidden bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 p-3.5 space-y-3.5 shadow-xs"
            >
              <div className="aspect-[16/10] w-full rounded-[22px] bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-40 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                  <div className="h-5 w-12 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
                </div>
                <div className="h-3.5 w-52 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-3 w-16 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                  <div className="h-3 w-20 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export function CraveXPSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#090e0b] text-[#18201c] dark:text-white">
      <SkeletonNavbar />

      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Cockpit Skeleton */}
        <div className="rounded-[32px] p-6 sm:p-8 bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-4">
          <div className="h-6 w-48 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-10 sm:h-12 w-3/4 max-w-lg rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-4 w-1/2 max-w-sm rounded-lg bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-7 w-32 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-7 w-36 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="h-14 w-full rounded-[24px] bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 animate-pulse" />

        {/* Category Pills Skeleton */}
        <div className="flex gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-28 rounded-[20px] bg-black/5 dark:bg-white/10 animate-pulse shrink-0" />
          ))}
        </div>

        {/* Product Cards Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-[28px] p-3.5 bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-3"
            >
              <div className="aspect-square w-full rounded-[22px] bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-3 w-16 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-4 w-32 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-12 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                <div className="h-8 w-16 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#18201c] dark:text-white">
      <SkeletonNavbar />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="h-8 w-44 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        <div className="space-y-4 max-w-2xl">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[26px] p-5 bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-36 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="h-4 w-48 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export function TrackSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#18201c] dark:text-white">
      <SkeletonNavbar />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="h-8 w-48 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-96 rounded-[32px] bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-96 rounded-[32px] bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 p-5 space-y-4">
            <div className="h-6 w-32 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-44 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-20 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-12 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#18201c] dark:text-white">
      <SkeletonNavbar />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="h-8 w-36 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        <div className="max-w-xl rounded-[32px] p-6 bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
              <div className="h-3.5 w-44 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="h-12 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-12 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
          <div className="h-12 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
      </main>
    </div>
  )
}

export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#18201c] dark:text-white">
      <SkeletonNavbar />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="h-8 w-36 rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 rounded-[28px] bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 p-5 space-y-3">
            <div className="h-5 w-32 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
            <div className="h-12 w-full rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse mt-4" />
          </div>
        </div>
      </main>
    </div>
  )
}

