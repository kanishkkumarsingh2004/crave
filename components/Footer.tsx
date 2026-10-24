'use client'

import CraveLogo from '@/components/CraveLogo'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function Footer({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`bg-[#0b100d] text-stone-400 text-xs py-10 md:py-14 border-t border-stone-800/80 font-sans selection:bg-[#d9f447] selection:text-[#121815] ${className}`}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12 pb-10 border-b border-stone-800/80">
          {/* Column 1: Brand & Operational Status (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3.5">
            <Link href="/" className="inline-flex items-center gap-2">
              <CraveLogo variant="full" size="lg" theme="light" />
            </Link>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed font-medium">
              Food delivery from your favorite neighbourhood restaurants and 15-minute essentials.
              Fresh ingredients, transparent pricing, and fast doorstep delivery.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-stone-500 pt-1">
              <span className="size-1.5 rounded-full bg-[#d9f447]" />
              <span>Bengaluru, Karnataka</span>
            </div>
          </div>

          {/* Column 2: Order & Services (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white">
              Order
            </h4>
            <ul className="flex flex-col gap-2.5 font-medium">
              <li>
                <Link href="/user/explore" className="hover:text-white transition-colors">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/user/cravexp" className="hover:text-white transition-colors">
                  Instant Essentials
                </Link>
              </li>
              <li>
                <Link href="/user/orders" className="hover:text-white transition-colors">
                  Track Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Access (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white">
              Portals
            </h4>
            <ul className="flex flex-col gap-2.5 font-medium">
              <li>
                <Link href="/user/dashboard" className="hover:text-white transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/vendor/dashboard" className="hover:text-white transition-colors">
                  Restaurant Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/driver/dashboard" className="hover:text-white transition-colors">
                  Delivery Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Trust & Support (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white">
              Support
            </h4>
            <ul className="flex flex-col gap-2.5 font-medium">
              <li>
                <Link href="/policies" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/policies/terms-of-service"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500 font-medium">
          <p>© 2026 Crave. All rights reserved.</p>
          <div className="flex items-center gap-2 text-stone-400">
            <span className="font-mono tracking-wider text-[10px] uppercase">
              Fast Dispatch • Transparent Pricing
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
