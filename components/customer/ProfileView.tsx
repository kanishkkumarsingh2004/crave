'use client'

import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import ThemeSelector from '@/components/ThemeSelector'
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Home,
  KeyRound,
  Loader2,
  LocateFixed,
  Lock,
  LogOut,
  Mail,
  MapPin,
  PhoneCall,
  Plus,
  ShoppingBag,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import type { CustomerAddress, LatLngCoords } from './types'

interface ProfileViewProps {
  user: any
  logout: () => void
  pastOrdersCount: number
  savedAddresses: CustomerAddress[]
  deliveryAddress: string
  onSaveProfile: (name: string, phone: string, address: string) => Promise<void>
  onDeleteAddress: (id: string, label: string) => Promise<void>
  onSelectAddress: (address: string, coords?: LatLngCoords | null) => void
  onOpenAddAddressModal: () => void
  onNavigateToHelp: () => void
}

export default function ProfileView({
  user,
  logout,
  pastOrdersCount,
  savedAddresses,
  deliveryAddress,
  onSaveProfile,
  onDeleteAddress,
  onSelectAddress,
  onOpenAddAddressModal,
  onNavigateToHelp,
}: ProfileViewProps) {
  const [editAddress, setEditAddress] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)

  const [profileNameInput, setProfileNameInput] = useState(user?.name || '')
  const [profilePhoneInput, setProfilePhoneInput] = useState(user?.phone || '')
  const [addressInput, setAddressInput] = useState(deliveryAddress || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password Management
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const handleProfileSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setIsSavingProfile(true)
    try {
      await onSaveProfile(profileNameInput, profilePhoneInput, addressInput)
      setEditAddress(false)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setPasswordFeedback(null)

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' })
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password cannot be the same as your current password.',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password')
      }
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err?.message || 'Failed to update password' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6 pb-28 sm:pb-16 px-1 sm:px-0">
      {/* 1. Profile Hero Card */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="grid size-16 sm:size-20 place-items-center rounded-full bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white font-bold text-2xl sm:text-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs">
                {(user?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 grid size-5 sm:size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#161617] shadow-xs">
                <Check className="size-3 sm:size-3.5 stroke-[3]" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified Account
                </span>
                <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
                  Crave Member
                </span>
              </div>

              <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white truncate">
                {user?.name || 'Customer Account'}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 font-medium">
                {user?.email && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 text-stone-400" />
                    <span className="truncate">{user.email}</span>
                  </span>
                )}
                {user?.email && user?.phone && <span>&bull;</span>}
                {user?.phone ? (
                  <span className="flex items-center gap-1.5">
                    <PhoneCall className="size-3.5 text-stone-400" />
                    {user.phone}
                  </span>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 italic">No phone added</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Native App Pill Bar */}
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-black/[0.05] dark:border-white/[0.05]">
            <button
              onClick={() => {
                setEditAddress(!editAddress)
                if (!editAddress) setShowPasswordSection(false)
              }}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition min-h-[44px] cursor-pointer ${
                editAddress
                  ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-xs'
                  : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/15'
              }`}
            >
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{editAddress ? 'Close' : 'Edit'}</span>
            </button>
            <button
              onClick={() => {
                setShowPasswordSection(!showPasswordSection)
                if (!showPasswordSection) setEditAddress(false)
              }}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition min-h-[44px] cursor-pointer ${
                showPasswordSection
                  ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] shadow-xs'
                  : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/15'
              }`}
            >
              <KeyRound className="size-3.5 shrink-0" />
              <span className="truncate">Password</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-3.5 py-2.5 text-xs font-semibold transition min-h-[44px] cursor-pointer"
            >
              <LogOut className="size-3.5 shrink-0" />
              <span className="truncate">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Real Account Stats - Apple Inset Chips */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 border-t border-black/[0.06] dark:border-white/[0.06] pt-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] p-3 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="grid size-9 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShoppingBag className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-white leading-tight">
                {pastOrdersCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate">
                Orders
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] p-3 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="grid size-9 place-items-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <MapPin className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-white leading-tight">
                {savedAddresses.length}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate">
                Addresses
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-3 rounded-2xl bg-stone-50 dark:bg-white/[0.03] p-3 border border-black/[0.04] dark:border-white/[0.04]">
            <div className="grid size-9 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Home className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-[#1D1D1F] dark:text-white truncate">
                {deliveryAddress ? deliveryAddress.split(',')[0] : 'None'}
              </p>
              <p className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate">
                Active Drop
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Edit Profile Details Drawer */}
      {editAddress && (
        <form
          onSubmit={handleProfileSubmit}
          className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <User className="size-4 text-stone-500" /> Edit Profile Details
            </h3>
            <span className="text-[11px] text-stone-400">Direct account sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
                Full Name
              </label>
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white px-4 py-3 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
                Phone Number
              </label>
              <input
                type="tel"
                value={profilePhoneInput}
                onChange={(e) => setProfilePhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white px-4 py-3 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
              Primary Doorstep Address
            </label>
            <textarea
              rows={2}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Building, street, area, city..."
              className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white p-3.5 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setEditAddress(false)}
              className="rounded-full border border-black/[0.08] dark:border-white/[0.08] px-5 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition min-h-[44px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-full bg-[#1D1D1F] dark:bg-white px-6 py-2.5 text-xs font-semibold text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 transition shadow-xs disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Password & Security Section */}
      {showPasswordSection && (
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06] gap-3 mb-5">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0 mt-0.5">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F] dark:text-white">
                  Password &amp; Security
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                  Update your account password securely.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Scrypt Encrypted
            </span>
          </div>

          {passwordFeedback && (
            <div
              className={`mb-5 flex items-start gap-3 rounded-2xl p-4 text-xs font-semibold transition ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/80'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p>{passwordFeedback.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordFeedback(null)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="size-3.5" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white pl-9 pr-10 py-3 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="size-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white pl-9 pr-10 py-3 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5 text-xs">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 text-[#1D1D1F] dark:text-white pl-9 pr-10 py-3 text-base sm:text-xs font-medium outline-none focus:border-black/30 dark:focus:border-white/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block size-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}
                  />
                  At least 8 characters
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block size-1.5 rounded-full ${newPassword && confirmPassword && newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}
                  />
                  Passwords match
                </span>
              </div>

              <button
                type="submit"
                disabled={
                  isChangingPassword || !currentPassword || !newPassword || !confirmPassword
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1D1D1F] dark:bg-white px-6 py-2.5 text-xs font-semibold text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Appearance & Theme Settings */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06] gap-2 mb-5">
          <div>
            <h3 className="font-bold text-base text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <Sun className="size-4 text-stone-500" />
              <span>App Theme &amp; Visual Appearance</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
              Choose your preferred visual theme for Crave.
            </p>
          </div>
          <span className="self-start sm:self-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Live Switching
          </span>
        </div>
        <ThemeSelector />
      </div>

      {/* 5. Notification Settings */}
      <NotificationSettingsCard />

      {/* 6. Saved Addresses */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.06] mb-4">
          <div>
            <h3 className="font-bold text-base text-[#1D1D1F] dark:text-white flex items-center gap-2">
              <MapPin className="size-4 text-stone-500" />
              <span>Saved Delivery Addresses</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
              Manage your destinations ({savedAddresses.length} saved)
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddAddressModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 active:scale-95 px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer min-h-[38px]"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span>Add New</span>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {savedAddresses.length === 0 ? (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-black/[0.12] dark:border-white/[0.12] p-6 text-center">
              <MapPin className="size-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
              <p className="text-xs font-bold text-[#1D1D1F] dark:text-white">
                No saved addresses yet
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Tap Add New to drop a pin or save your address.
              </p>
            </div>
          ) : (
            savedAddresses.map((addr) => {
              const isSelected = deliveryAddress === addr.address
              const hasCoords = addr.lat != null && addr.lng != null
              return (
                <div
                  key={addr.id}
                  className={`flex flex-col justify-between rounded-2xl p-4 border transition-all ${
                    isSelected
                      ? 'border-black dark:border-white bg-stone-50 dark:bg-white/[0.05] shadow-xs'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300 text-xs font-bold">
                          {addr.label.toLowerCase().includes('work') ? (
                            <Building2 className="size-3.5" />
                          ) : addr.label.toLowerCase().includes('home') ? (
                            <Home className="size-3.5" />
                          ) : (
                            <MapPin className="size-3.5" />
                          )}
                        </span>
                        <span className="font-bold text-xs text-[#1D1D1F] dark:text-white capitalize">
                          {addr.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Active
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteAddress(addr.id, addr.label)
                          }}
                          title="Delete address"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-300 font-medium my-2.5 line-clamp-2 leading-relaxed">
                      {addr.address}
                    </p>

                    {hasCoords && (
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono mb-3 flex items-center gap-1">
                        <LocateFixed className="size-2.5 text-stone-400" />
                        <span>
                          {addr.lat!.toFixed(4)}°, {addr.lng!.toFixed(4)}°
                        </span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onSelectAddress(
                        addr.address,
                        hasCoords ? { lat: addr.lat!, lng: addr.lng! } : null
                      )
                    }
                    className={`w-full py-2 rounded-full text-xs font-semibold transition cursor-pointer min-h-[38px] ${
                      isSelected
                        ? 'bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F]'
                        : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/15'
                    }`}
                  >
                    {isSelected ? 'Delivering Here' : 'Deliver Here'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer Support Banner */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 shrink-0">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-[#1D1D1F] dark:text-white">
              Need help with an ongoing order?
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              Call priority helpline at{' '}
              <a
                href="tel:+919625694673"
                className="font-semibold text-[#1D1D1F] dark:text-white underline"
              >
                -9625694673
              </a>{' '}
              (24/7).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onNavigateToHelp}
            className="flex-1 sm:flex-none justify-center rounded-full bg-[#1D1D1F] dark:bg-white px-5 py-2.5 text-xs font-semibold text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <HelpCircle className="size-3.5" />
            <span>Help Center</span>
          </button>
          <Link
            href="/policies"
            className="rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/5 px-4 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/10 transition shadow-2xs min-h-[44px] flex items-center justify-center"
          >
            Policies
          </Link>
        </div>
      </div>
    </div>
  )
}
