'use client'

import { Skeleton } from 'boneyard-js/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function CartFixture() {
  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e]">
      <Skeleton name="Navbar" loading={true}>
        <Navbar />
      </Skeleton>
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6">
        <Skeleton name="CartView" loading={true}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart items list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
                  <div className="h-5 w-40 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                </div>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-14 rounded-2xl bg-stone-200 dark:bg-white/10 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-32 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                        <div className="h-3 w-20 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-24 rounded-full bg-stone-200 dark:bg-white/10 animate-pulse" />
                      <div className="h-4 w-12 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Bill details */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-stone-200/80 dark:border-white/5 bg-white dark:bg-[#131b15] p-6 shadow-sm space-y-3">
                <div className="h-5 w-28 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-24 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-14 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3.5 w-28 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-14 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3.5 w-20 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-14 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-stone-100 dark:border-white/5">
                    <div className="h-5 w-24 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                    <div className="h-5 w-16 rounded bg-stone-200 dark:bg-white/10 animate-pulse" />
                  </div>
                </div>
                <div className="pt-3">
                  <div className="h-12 w-full rounded-2xl bg-stone-200 dark:bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </Skeleton>
      </main>
      <Footer />
    </div>
  )
}