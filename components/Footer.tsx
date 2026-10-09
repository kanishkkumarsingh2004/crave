'use client'

import CraveLogo from '@/components/CraveLogo'
import { ChevronDown, Globe, MapPin, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0f1412] text-gray-400 text-xs py-6 md:py-16 border-t border-gray-800/80 font-sans">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
        {/* =========================================================================
            MOBILE VIEW: SLEEK, COMPACT & MINIMAL FOOTER
           ========================================================================= */}
        <div className="md:hidden py-4 text-center space-y-3.5">
          <div className="flex items-center justify-center gap-2">
            <CraveLogo variant="full" size="md" theme="light" />
          </div>
          <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
            Fresh hyper-local culinary &amp; essentials delivery across Kanakapura Road Corridor.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-[11px] font-semibold text-gray-300">
            <Link href="/policies/terms-of-service" className="hover:text-white transition">
              Terms
            </Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/policies/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/policies/fssai" className="hover:text-white transition">
              FSSAI
            </Link>
            <span className="text-gray-600">&bull;</span>
            <Link href="/policies" className="hover:text-white transition">
              Help &amp; Support
            </Link>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            2026 &copy; crave.&trade; Ltd. All rights reserved.
          </p>
        </div>

        {/* =========================================================================
            DESKTOP VIEW: DETAILED 5-COLUMN COMPREHENSIVE FOOTER
           ========================================================================= */}
        <div className="hidden md:block">
          {/* =========================================================================
              TOP BAR: LOGO & COUNTRY / LANGUAGE SELECTOR
             ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-10 border-b border-gray-800/80">
            <Link href="/" className="inline-flex items-center gap-2">
              <CraveLogo variant="full" size="xl" theme="light" />
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#18201c] px-3.5 py-2 rounded-xl border border-gray-700/80 text-white font-semibold text-xs cursor-pointer hover:border-gray-500 transition select-none">
                <MapPin className="size-3.5 text-[#d9f447]" />
                <span>India</span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </div>

              <div className="flex items-center gap-2 bg-[#18201c] px-3.5 py-2 rounded-xl border border-gray-700/80 text-white font-semibold text-xs cursor-pointer hover:border-gray-500 transition select-none">
                <Globe className="size-3.5 text-[#b5de28]" />
                <span>English</span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* =========================================================================
            CLEAN 5 LINK COLUMNS (ALL REAL ACTIVE WORKING LINKS)
           ========================================================================= */}
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 py-12 border-b border-gray-800/80">
            {/* Column 1: Company */}
            <div>
              <h4 className="font-extrabold uppercase tracking-widest text-white text-[11px] mb-4">
                Company
              </h4>
              <ul className="flex flex-col gap-2.5 font-medium">
                <li>
                  <Link href="/" className="hover:text-white transition">
                    About crave.
                  </Link>
                </li>
                <li>
                  <Link href="/user/profile" className="hover:text-white transition">
                    Customer Support &amp; Profile
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition">
                    Sign In / Register Account
                  </Link>
                </li>
                <li>
                  <Link href="/policies" className="hover:text-white transition">
                    Trust &amp; Legal Center
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Crave Services */}
            <div>
              <h4 className="font-extrabold uppercase tracking-widest text-white text-[11px] mb-4">
                crave. Services
              </h4>
              <ul className="flex flex-col gap-2.5 font-medium">
                <li>
                  <Link href="/user/explore" className="hover:text-white transition">
                    Food Delivery
                  </Link>
                </li>
                <li>
                  <Link href="/user/cravexp" className="hover:text-white transition">
                    Crave XP Instamart
                  </Link>
                </li>
                <li>
                  <Link href="/user/orders" className="hover:text-white transition">
                    My Orders &amp; Live Tracking
                  </Link>
                </li>
                <li>
                  <Link href="/user/explore" className="hover:text-white transition">
                    Top Restaurant Deals
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: For Partners & Drivers */}
            <div>
              <h4 className="font-extrabold uppercase tracking-widest text-white text-[11px] mb-4">
                For Partners
              </h4>
              <ul className="flex flex-col gap-2.5 font-medium">
                <li>
                  <Link href="/vendor/dashboard" className="hover:text-white transition">
                    Crave EP Merchant Portal
                  </Link>
                </li>
                <li>
                  <Link href="/vendor/menu" className="hover:text-white transition">
                    Merchant Menu Console
                  </Link>
                </li>
                <li>
                  <Link href="/driver/dashboard" className="hover:text-white transition">
                    Delivery Partner Portal
                  </Link>
                </li>
                <li>
                  <Link href="/admin/dashboard" className="hover:text-white transition">
                    System Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Learn More / Legal */}
            <div>
              <h4 className="font-extrabold uppercase tracking-widest text-white text-[11px] mb-4">
                Learn More
              </h4>
              <ul className="flex flex-col gap-2.5 font-medium">
                <li>
                  <Link href="/policies/terms-of-service" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/policies/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/policies/cookies" className="hover:text-white transition">
                    Cookie Settings
                  </Link>
                </li>
                <li>
                  <Link href="/policies/security" className="hover:text-white transition">
                    Security &amp; Vulnerabilities
                  </Link>
                </li>
                <li>
                  <Link href="/policies/fssai" className="hover:text-white transition">
                    FSSAI Guidelines &amp; Compliance
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Social Links */}
            <div>
              <h4 className="font-extrabold uppercase tracking-widest text-white text-[11px] mb-4">
                Social Links
              </h4>

              {/* Social Icons */}
              <div className="flex items-center gap-3">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  className="grid size-8 place-items-center rounded-full bg-[#18201c] text-white hover:bg-[#b5de28] transition"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/crave._247?utm_source=qr&stkn=aGlxamtnbHo4cXd5"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="grid size-8 place-items-center rounded-full bg-[#18201c] text-white hover:bg-[#b5de28] transition"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X / Twitter"
                  className="grid size-8 place-items-center rounded-full bg-[#18201c] text-white hover:bg-[#b5de28] transition"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="grid size-8 place-items-center rounded-full bg-[#18201c] text-white hover:bg-[#b5de28] transition"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  className="grid size-8 place-items-center rounded-full bg-[#18201c] text-white hover:bg-[#b5de28] transition"
                >
                  <svg className="size-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* =========================================================================
            BOTTOM LEGAL DISCLAIMER & COPYRIGHT
           ========================================================================= */}
          <div className="pt-8 flex flex-col lg:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 font-medium">
            <p className="leading-relaxed max-w-3xl text-center lg:text-left">
              By continuing past this page, you agree to our{' '}
              <Link href="/policies/terms-of-service" className="underline hover:text-gray-300">
                Terms of Service
              </Link>
              ,{' '}
              <Link href="/policies/cookies" className="underline hover:text-gray-300">
                Cookie Policy
              </Link>
              ,{' '}
              <Link href="/policies/privacy" className="underline hover:text-gray-300">
                Privacy Policy
              </Link>{' '}
              and Content Policies. All trademarks are properties of their respective owners. 2026 ©
              crave.™ Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-gray-400 shrink-0 font-semibold">
              <ShieldCheck className="size-4 text-[#b5de28]" />
              <span>Kanakapura Road Corridor, Bengaluru</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
