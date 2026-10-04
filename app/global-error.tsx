'use client'

import Link from 'next/link'
import { CircleAlert, Home, RefreshCw, UtensilsCrossed } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 min-h-screen bg-[#18201c] text-[#f8f9f7] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-rose-500/5 blur-[130px]" />
          <div className="absolute bottom-1/4 right-1/4 size-[400px] rounded-full bg-[#d9f447]/3 blur-[120px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col items-center justify-center px-5 py-16 text-center">
          <div className="mb-8 flex items-center justify-center gap-2">
            <UtensilsCrossed className="size-12 text-[#d9f447]" />
            <span className="text-6xl font-black tracking-tight">
              crave<span className="text-[#d9f447]">.</span>
            </span>
          </div>

          <div className="mb-6 flex justify-center text-rose-400">
            <CircleAlert className="size-20" />
          </div>

          <h1 className="text-3xl font-extrabold text-white sm:text-4xl mb-3">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-10">
            An unexpected error occurred. Our team has been notified. Please try again or return to
            the homepage.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#d9f447] px-6 py-3 text-sm font-extrabold text-[#18201c] transition hover:bg-[#c2dc37] hover:scale-105 active:scale-95 shadow-2xl"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-bold text-gray-200 transition hover:bg-gray-700"
            >
              <Home className="size-4" />
              Home
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 max-w-md text-left">
              <summary className="cursor-pointer text-xs font-bold text-gray-400">
                Error details (dev mode)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{error.message}</pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}
