'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Bike,
  Building,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  Zap,
} from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'
import Navbar, { roleDetails } from '@/components/Navbar'

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()

  const [selectedRole, setSelectedRole] = useState<UserRole>('customer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  // Role specific fields
  const [address, setAddress] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [vehicleType, setVehicleType] = useState('Electric Scooter')
  const [licensePlate, setLicensePlate] = useState('')
  const [adminCode, setAdminCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    await signup({
      name,
      email,
      role: selectedRole,
      phone,
      address: selectedRole === 'customer' ? address : undefined,
      restaurantName: selectedRole === 'vendor' ? restaurantName : undefined,
      cuisine: selectedRole === 'vendor' ? cuisine : undefined,
      vehicleType: selectedRole === 'driver' ? vehicleType : undefined,
      licensePlate: selectedRole === 'driver' ? licensePlate : undefined,
      adminCode: selectedRole === 'admin' ? adminCode : undefined,
    })

    const targetPath = selectedRole === 'customer' ? '/user/dashboard' : `/${selectedRole}/dashboard`
    router.push(targetPath)
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto my-10 w-full max-w-xl px-4">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xl sm:p-8">
          {/* Header */}
          <div className="text-center">
            <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6d8213]">
              Join the Network
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#18201c] sm:text-3xl">
              Create Your Account on <span className="text-[#7d9518]">crave.</span>
            </h1>
            <p className="mt-1 text-xs text-[#717c76]">
              Choose your role below to get customized platform access.
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="mt-6">
            <label className="text-xs font-bold text-[#18201c] mb-2 block">
              1. Select Your User Type (4 Roles)
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(roleDetails) as UserRole[]).map((r) => {
                const info = roleDetails[r]
                const IconComponent = info.icon
                const isSelected = selectedRole === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                      isSelected
                        ? 'border-[#a3ba24] bg-[#f3f7ea] ring-2 ring-[#d9f447]/50 shadow-sm'
                        : 'border-[#dfe4dc] bg-white hover:bg-[#f8f9f6]'
                    }`}
                  >
                    <span className={`grid size-9 place-items-center rounded-xl ${info.bg}`}>
                      <IconComponent className={`size-4 ${info.color}`} />
                    </span>
                    <span className="mt-2 text-xs font-bold text-[#18201c] capitalize">{info.title}</span>
                    <span className="text-[9px] text-gray-500 font-normal">{info.badge}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role-tailored Sign Up Form */}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="rounded-2xl bg-[#f8f9f6] p-3 text-xs font-bold text-[#717c76] border border-[#e1e6df]">
              Signing up as:{' '}
              <span className="text-[#18201c] capitalize font-extrabold">{selectedRole}</span> account
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <User className="size-3.5 text-[#7e9619]" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Mail className="size-3.5 text-[#7e9619]" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Lock className="size-3.5 text-[#7e9619]" /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <Phone className="size-3.5 text-[#7e9619]" /> Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>
            </div>

            {selectedRole === 'customer' && (
              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[#7e9619]" /> Delivery Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="House/Flat No., Street, Area, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>
            )}

            {selectedRole === 'vendor' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                    <Store className="size-3.5 text-amber-700" /> Restaurant Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spice Route Bistro"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                    <Building className="size-3.5 text-amber-700" /> Cuisine Speciality
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Healthy Bowls & Salads"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'driver' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                    <Bike className="size-3.5 text-blue-700" /> Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] bg-white px-3.5 py-2 text-xs outline-none"
                  >
                    <option value="Electric Scooter">Electric Scooter (EV)</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                    <FileText className="size-3.5 text-blue-700" /> License Plate Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KA 01 EV 9821"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'admin' && (
              <div>
                <label className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-purple-700" /> Admin Secret Passcode
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter organization admin key (e.g. CRAVE-SYS-8890)"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2 text-xs outline-none focus:border-[#8fa71c]"
                />
              </div>
            )}

            <button
              type="submit"
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
            >
              Complete Registration <ArrowRight className="size-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#717c76]">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#7d9518] hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        © 2026 crave. Multi-role authentication & dashboard system.
      </footer>
    </div>
  )
}
