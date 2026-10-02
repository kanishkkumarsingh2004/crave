'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  LocateFixed,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import Navbar, { roleDetails } from '@/components/Navbar'
import { useAuth, UserRole } from '@/lib/auth-context'

const featuredRestaurants = [
  {
    name: 'The Green Table',
    cuisine: 'Healthy bowls · Salads',
    rating: '4.8',
    eta: '25–30 min',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    tag: 'Healthy',
  },
  {
    name: 'Momo House & Asian Grill',
    cuisine: 'Asian · Dumplings',
    rating: '4.7',
    eta: '20–25 min',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=85',
    tag: 'Popular',
  },
  {
    name: 'Casa Napoli Pizza',
    cuisine: 'Italian · Pizza',
    rating: '4.9',
    eta: '30–35 min',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
  },
]

export default function HomePage() {
  const { user, role, loginAsRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      const targetDashboard = role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`
      router.replace(targetDashboard)
    }
  }, [user, role, router])

  if (user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Redirecting to your {role} Dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c]">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-16">
        <div className="max-w-[580px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe6bf] bg-[#f2f8db] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#617316]">
            <span className="size-2 rounded-full bg-[#a9c525] animate-ping" />
            Live Network · 4 Roles Connected in Real-Time
          </div>

          <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold leading-[.92] tracking-tight">
            Satisfy your<br />
            <span className="text-[#89a217]">crave.</span><br />
            On its way.
          </h1>

          <p className="mt-6 text-base leading-7 text-[#647169]">
            The unified food platform connecting <span className="font-bold text-[#18201c]">Customers</span>,{' '}
            <span className="font-bold text-[#18201c]">Vendors</span>,{' '}
            <span className="font-bold text-[#18201c]">Drivers</span>, and{' '}
            <span className="font-bold text-[#18201c]">Admins</span> seamlessly.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="group flex items-center gap-2.5 rounded-full bg-[#d9f447] px-6 py-3.5 text-xs font-bold text-[#18201c] shadow-[0_8px_20px_rgba(217,244,71,0.3)] transition hover:-translate-y-0.5"
            >
              Sign Up Now <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-[#dce2da] bg-white px-6 py-3.5 text-xs font-bold text-[#18201c] transition hover:bg-[#f2f5ee]"
            >
              Log In to Account
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-8 text-xs font-semibold text-[#75817a]">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 text-[#8ca51c]" /> Avg 24 min delivery
            </span>
            <span className="flex items-center gap-2">
              <PackageCheck className="size-4 text-[#8ca51c]" /> Real-time order sync
            </span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative min-h-[420px] overflow-hidden rounded-[36px] bg-[#e1e9d3] p-6 lg:min-h-[520px]">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#849c38 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center justify-between rounded-2xl bg-white/90 p-3.5 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#d9f447] text-[#18201c]">
                  <UtensilsCrossed className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold">crave. Ecosystem</p>
                  <p className="text-[10px] text-[#717d77]">Select any perspective below</p>
                </div>
              </div>
              <span className="rounded-full bg-[#f0f5da] px-3 py-1 text-[10px] font-bold text-[#6a8014]">
                Active Network
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto py-6">
              {(Object.keys(roleDetails) as UserRole[]).map((rKey) => {
                const details = roleDetails[rKey]
                const IconComp = details.icon
                const targetUrl = rKey === 'customer' ? '/user/dashboard' : `/${rKey}/dashboard`
                return (
                  <Link
                    key={rKey}
                    href={targetUrl}
                    onClick={() => loginAsRole(rKey)}
                    className="group rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`grid size-9 place-items-center rounded-xl ${details.bg}`}>
                        <IconComp className={`size-4 ${details.color}`} />
                      </span>
                      <ArrowRight className="size-4 text-[#89958d] transition group-hover:translate-x-1 group-hover:text-[#18201c]" />
                    </div>
                    <h3 className="mt-3 font-bold text-sm text-[#18201c]">{details.title}</h3>
                    <p className="text-[11px] text-[#6b7670] mt-0.5">{details.badge}</p>
                  </Link>
                )
              })}
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 backdrop-blur-md flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#819289]">Live Order #CRV-9021</p>
                <p className="text-xs font-bold text-[#18201c]">The Green Table ➔ Alex Rivera (8 min away)</p>
              </div>
              <span className="rounded-full bg-[#d9f447] px-3 py-1 text-[10px] font-bold text-[#18201c]">
                On Route 🛵
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="border-t border-[#e5e9e1] bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="rounded-full bg-[#f1f6d9] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6a8014]">
              Multi-Role Platform Architecture
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Engineered for Every Stakeholder
            </h2>
            <p className="mt-2 text-sm text-[#6f7a73]">
              Whether ordering, cooking, delivering, or managing — crave. delivers a customized dashboard.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-[#dfe4dc] bg-[#f8f9f6] p-6 flex flex-col justify-between hover:border-[#a3ba24] transition">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold mb-4">
                  <ShoppingBag className="size-6" />
                </div>
                <h3 className="text-xl font-bold">1. Customer User</h3>
                <p className="mt-2 text-xs leading-5 text-[#6c7771]">
                  Discover top kitchens, customize dishes, pay via secure UPI, and track live delivery routes.
                </p>
              </div>
              <Link
                href="/user/dashboard"
                onClick={() => loginAsRole('customer')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
              >
                Launch Customer View <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#dfe4dc] bg-[#f8f9f6] p-6 flex flex-col justify-between hover:border-[#a3ba24] transition">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 font-bold mb-4">
                  <Store className="size-6" />
                </div>
                <h3 className="text-xl font-bold">2. Kitchen Vendor</h3>
                <p className="mt-2 text-xs leading-5 text-[#6c7771]">
                  Live incoming order queue, stock toggles, prep timer, and sales analytics sidebar.
                </p>
              </div>
              <Link
                href="/vendor/dashboard"
                onClick={() => loginAsRole('vendor')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:underline"
              >
                Launch Vendor Console <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#dfe4dc] bg-[#f8f9f6] p-6 flex flex-col justify-between hover:border-[#a3ba24] transition">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-blue-100 text-blue-800 font-bold mb-4">
                  <Bike className="size-6" />
                </div>
                <h3 className="text-xl font-bold">3. Delivery Driver</h3>
                <p className="mt-2 text-xs leading-5 text-[#6c7771]">
                  Duty status toggle, active trip navigation, step-by-step confirmation, and earnings ledger.
                </p>
              </div>
              <Link
                href="/driver/dashboard"
                onClick={() => loginAsRole('driver')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:underline"
              >
                Launch Driver Cockpit <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#dfe4dc] bg-[#f8f9f6] p-6 flex flex-col justify-between hover:border-[#a3ba24] transition">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-purple-100 text-purple-800 font-bold mb-4">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="text-xl font-bold">4. System Admin</h3>
                <p className="mt-2 text-xs leading-5 text-[#6c7771]">
                  Network stats, user management across all 4 roles, UPI verification queue, and sidebar control.
                </p>
              </div>
              <Link
                href="/admin/dashboard"
                onClick={() => loginAsRole('admin')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 hover:underline"
              >
                Launch Admin Center <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Kitchens */}
      <section className="py-16 lg:py-24 border-t border-[#e5e9e1]">
        <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#799017]">Local Top Picks</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Popular Kitchens on crave.</h2>
            </div>
            <Link
              href="/user/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold text-[#18201c] hover:underline"
            >
              Explore all 2,000+ kitchens <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featuredRestaurants.map((rest) => (
              <div key={rest.name} className="group overflow-hidden rounded-3xl border border-[#e1e6df] bg-white">
                <div className="relative h-48 overflow-hidden">
                  <img src={rest.image} alt={rest.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase text-[#4f5f15]">
                    {rest.tag}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-[#18201c] px-3 py-1 text-[10px] font-bold text-white">
                    {rest.eta}
                  </span>
                </div>
                <div className="p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base">{rest.name}</h3>
                    <p className="mt-0.5 text-xs text-[#737e77]">{rest.cuisine}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-[#f1f6d9] px-2.5 py-1 text-[11px] font-bold text-[#5c6e12]">
                    <Star className="size-3 fill-[#8ea71b] text-[#8ea71b]" />
                    {rest.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e9e1] bg-white py-8">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 px-5 text-xs text-[#7a857e] sm:flex-row lg:px-8">
          <span>© 2026 crave. Multi-role Food Delivery Platform.</span>
          <div className="flex gap-4 font-semibold text-[#18201c]">
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
            <Link href="/user/dashboard">Customer</Link>
            <Link href="/vendor/dashboard">Vendor</Link>
            <Link href="/driver/dashboard">Driver</Link>
            <Link href="/admin/dashboard">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
