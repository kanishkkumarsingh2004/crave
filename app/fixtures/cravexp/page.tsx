'use client'

import { Skeleton } from 'boneyard-js/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function CraveXPFixture() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e]">
      <Skeleton name="Navbar" loading={true}>
        <Navbar />
      </Skeleton>
      <main className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-6 sm:pt-6">
        <Skeleton name="CraveXPView" loading={true}>
          <div className="flex flex-col gap-6">
            {/* Hero Banner */}
            <div className="relative h-44 sm:h-64 lg:h-72 rounded-3xl overflow-hidden border border-stone-200/70 dark:border-white/5">
              <div className="size-full bg-stone-200 dark:bg-white/10 animate-pulse" />
              <div className="absolute bottom-6 left-6 space-y-2 max-w-md">
                <div className="h-4 w-28 rounded-md bg-stone-300 dark:bg-white/15 animate-pulse" />
                <div className="h-7 w-3/4 rounded-xl bg-stone-300 dark:bg-white/15 animate-pulse" />
                <div className="h-3.5 w-1/2 rounded-md bg-stone-300 dark:bg-white/15 animate-pulse" />
              </div>
            </div>
            
            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 rounded-md bg-stone-200 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-16 rounded-md bg-stone-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <div key={n} className="flex shrink-0 flex-col items-center gap-2">
                    <div className="size-16 sm:size-20 rounded-full bg-stone-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3 w-14 rounded-md bg-stone-200 dark:bg-white/10 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Products Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 rounded-lg bg-stone-200 dark:bg-white/10 animate-pulse" />
                <div className="h-4 w-20 rounded-md bg-stone-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
                  <div
                    key={card}
                    className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-3.5 space-y-3 shadow-xs"
                  >
                    <div className="relative h-44 w-full rounded-2xl overflow-hidden">
                      <div className="size-full bg-stone-200 dark:bg-white/10 animate-pulse" />
                      <div className="absolute top-2.5 left-2.5">
                        <div className="h-5 w-16 rounded-full bg-white/40 dark:bg-black/40 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-5 w-3/5 rounded-md bg-stone-200 dark:bg-white/10 animate-pulse" />
                        <div className="h-5 w-12 rounded-full bg-stone-200 dark:bg-white/10 animate-pulse" />
                      </div>
                      <div className="h-3.5 w-4/5 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-white/5">
                        <div className="h-4 w-20 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                        <div className="h-4 w-16 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Skeleton>
      </main>
      <Footer />
    </div>
  )
}