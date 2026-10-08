'use client'

import CraveLogo from '@/components/CraveLogo'
import Footer from '@/components/Footer'
import { Lock, Search, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface PolicyLayoutProps {
  children: React.ReactNode
  title: string
  lastUpdated: string
  activeDoc: string
}

const POLICY_NAV_ITEMS = [
  { label: 'Guidelines and Policies', href: '/policies', id: 'general' },
  { label: 'Terms of Service', href: '/policies/terms-of-service', id: 'terms-of-service' },
  { label: 'Privacy Policy', href: '/policies/privacy', id: 'privacy' },
  { label: 'Cookie Settings & Policy', href: '/policies/cookies', id: 'cookies' },
  { label: 'Security & Vulnerabilities', href: '/policies/security', id: 'security' },
  { label: 'FSSAI & Food Standards', href: '/policies/fssai', id: 'fssai' },
]

export default function PolicyLayout({
  children,
  title,
  lastUpdated,
  activeDoc,
}: PolicyLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col font-sans selection:bg-[#b5de28]/20 selection:text-[#18201c]">
      {/* =========================================================================
          POLICY HEADER / NAVBAR (LIGHT THEME)
         ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <CraveLogo variant="full" size="lg" theme="dark" />
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-gray-200" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <ShieldCheck className="size-4 text-[#b5de28]" />
              Trust &amp; Legal Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search policies..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#18201c] placeholder-gray-400 focus:outline-none focus:border-[#b5de28] focus:bg-white transition"
              />
            </div>
            <Link
              href="/user/explore"
              className="bg-[#18201c] text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#28352f] transition flex items-center gap-1.5 shadow-sm"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN LAYOUT: SIDEBAR + DOCUMENT BODY (WHITE THEME)
         ========================================================================= */}
      <div className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* LEFT SIDEBAR NAVIGATION (WHITE THEME) */}
          <aside className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm lg:sticky lg:top-24">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 mb-4 px-2">
              Legal Documentation
            </h3>

            <nav className="flex flex-col gap-1">
              {POLICY_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || activeDoc === item.id
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#b5de28]/15 text-[#5e720d] border border-[#b5de28]/30 font-bold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#18201c]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="size-1.5 rounded-full bg-[#b5de28]" />}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-500 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#18201c] font-bold">
                <Lock className="size-3.5 text-[#b5de28]" />
                <span>Security Assurance</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500">
                All data transmission across crave. is encrypted via SSL/TLS protocols compliant
                with ISO 27001 &amp; FSSAI guidelines.
              </p>
            </div>
          </aside>

          {/* MAIN POLICY CONTENT CONTAINER (WHITE THEME) */}
          <main className="lg:col-span-3 bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-10 shadow-sm">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 font-medium">
              <Link href="/" className="hover:text-[#18201c] transition">
                Home
              </Link>
              <span>/</span>
              <Link href="/policies" className="hover:text-[#18201c] transition">
                Policies
              </Link>
              <span>/</span>
              <span className="text-[#5e720d] font-bold">{title}</span>
            </div>

            {/* Document Header */}
            <div className="border-b border-gray-100 pb-6 mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18201c] tracking-tight mb-2">
                {title}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Last updated on <span className="text-gray-800 font-semibold">{lastUpdated}</span>
              </p>
            </div>

            {/* Document Prose Content */}
            <div className="prose prose-slate max-w-none text-sm text-gray-700 leading-relaxed">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* =========================================================================
          GLOBAL FOOTER
         ========================================================================= */}
      <Footer />
    </div>
  )
}
