'use client'

import CraveLogo from '@/components/CraveLogo'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0b100d] text-stone-400 text-xs py-10 md:py-14 border-t border-stone-800/80 font-sans selection:bg-[#d9f447] selection:text-[#121815]">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12 pb-10 border-b border-stone-800/80">
          {/* Column 1: Brand & Operational Status (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3.5">
            <Link href="/" className="inline-flex items-center gap-2">
              <CraveLogo variant="full" size="lg" theme="light" />
            </Link>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed font-medium">
              Curated gastronomy from South Bengaluru&apos;s master hearths and dark-store essentials.
              Dispatched with temperature-controlled precision in 25 minutes.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-stone-500 pt-1">
              <span className="size-1.5 rounded-full bg-[#d9f447]" />
              <span>Kanakapura Road Corridor • Bengaluru</span>
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
                  Food Delivery
                </Link>
              </li>
              <li>
                <Link href="/user/cravexp" className="hover:text-white transition-colors">
                  CraveXP Flash
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
                <Link href="/user/profile" className="hover:text-white transition-colors">
                  Patron Account
                </Link>
              </li>
              <li>
                <Link href="/vendor/dashboard" className="hover:text-white transition-colors">
                  Kitchen Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/driver/dashboard" className="hover:text-white transition-colors">
                  Courier Fleet Portal
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
              Trust
            </h4>
            <ul className="flex flex-col gap-2.5 font-medium">
              <li>
                <Link href="/policies" className="hover:text-white transition-colors">
                  Help &amp; Support
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/terms-of-service" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Protocol */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500 font-medium">
          <p>© 2026 crave.™ Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2 text-stone-400">
            <ShieldCheck className="size-3.5 text-[#d9f447]" />
            <span className="font-mono tracking-wider text-[10px] uppercase">
              256-Bit TLS • Zero Surcharge Transparency
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
