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
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
      {/* 1. Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-linear-to-br from-white via-[#fbfcf9] to-[#f4f7ed] dark:from-[#18201c] dark:via-[#1c2621] dark:to-[#141b17] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="grid size-16 sm:size-20 place-items-center rounded-2xl bg-linear-to-tr from-[#b5de28] to-[#d9f447] text-[#18201c] font-black text-2xl sm:text-3xl shadow-md ring-4 ring-[#b5de28]/20">
                {(user?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#18201c] shadow-xs">
                <Check className="size-3.5 stroke-[3]" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified Customer Account
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Crave Member
                </span>
              </div>

              <h2 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#18201c] dark:text-white">
                {user?.name || 'Customer Account'}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#55635a] dark:text-gray-300 font-medium">
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5 text-[#b5de28]" />
                    {user.email}
                  </span>
                )}
                {user?.email && user?.phone && <span>&bull;</span>}
                {user?.phone ? (
                  <span className="flex items-center gap-1">
                    <PhoneCall className="size-3.5 text-[#b5de28]" />
                    {user.phone}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 italic">No phone added</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                setEditAddress(!editAddress)
                if (!editAddress) setShowPasswordSection(false)
              }}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                editAddress
                  ? 'border-[#b5de28] bg-[#b5de28]/10 text-[#18201c] dark:text-[#d9f447]'
                  : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f4f7ed] dark:hover:bg-[#27342d]'
              }`}
            >
              <User className="size-3.5" />
              {editAddress ? 'Close Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={() => {
                setShowPasswordSection(!showPasswordSection)
                if (!showPasswordSection) setEditAddress(false)
              }}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                showPasswordSection
                  ? 'border-[#b5de28] bg-[#b5de28]/15 text-[#18201c] dark:text-[#d9f447]'
                  : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f4f7ed] dark:hover:bg-[#27342d]'
              }`}
            >
              <KeyRound className="size-3.5 text-[#b5de28]" />
              {showPasswordSection ? 'Hide Security' : 'Change Password'}
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-xs cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Real Account Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#e5e9e0] dark:border-[#27342d] pt-6 relative z-10">
          <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="text-lg font-black text-[#18201c] dark:text-white">{pastOrdersCount}</p>
              <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                Total Orders Placed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
            <div className="grid size-11 place-items-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-lg font-black text-[#18201c] dark:text-white">{savedAddresses.length}</p>
              <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                Saved Addresses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
            <div className="grid size-11 place-items-center rounded-xl bg-[#d9f447]/20 text-[#18201c] dark:text-[#d9f447] shrink-0">
              <Home className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-[#18201c] dark:text-white truncate">
                {deliveryAddress ? deliveryAddress.split(',')[0] : 'None Selected'}
              </p>
              <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                Active Delivery Destination
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Edit Profile Details Drawer */}
      {editAddress && (
        <form onSubmit={handleProfileSubmit} className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-md animate-in slide-in-from-top-4 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27342d]">
            <h3 className="text-sm font-bold text-[#18201c] dark:text-white flex items-center gap-2">
              <User className="size-4 text-[#b5de28]" /> Edit Profile &amp; Contact Details
            </h3>
            <span className="text-[11px] text-gray-400">Synced directly to your account</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
                Full Name
              </label>
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
              />
            </div>

            <div>
              <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
                Phone Number
              </label>
              <input
                type="tel"
                value={profilePhoneInput}
                onChange={(e) => setProfilePhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
              Primary Doorstep Address
            </label>
            <textarea
              rows={2}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter building, street, area, city..."
              className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27342d]">
            <button
              type="button"
              onClick={() => setEditAddress(false)}
              className="rounded-xl border border-gray-200 dark:border-[#27342d] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27342d] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Dedicated Security & Change Password Section */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] gap-3 mb-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#d9f447]/20 text-[#18201c] dark:text-[#d9f447] shrink-0 mt-0.5">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                <span>Password &amp; Security</span>
              </h3>
              <p className="text-xs text-[#55635a] dark:text-gray-400 mt-0.5 font-medium">
                Update your account password securely. Changes are encrypted and saved directly to the database.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Scrypt Encrypted</span>
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
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="size-3.5" />
                </div>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="size-3.5" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#27342d]">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#66756c] dark:text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <span className={`inline-block size-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                At least 8 characters
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span className={`inline-block size-1.5 rounded-full ${newPassword && confirmPassword && newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                Passwords match
              </span>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

      {/* 4. Appearance & Theme Settings */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] gap-2 mb-5">
          <div>
            <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <Sun className="size-4 text-[#b5de28]" />
              <span>App Theme &amp; Visual Appearance</span>
            </h3>
            <p className="text-xs text-[#55635a] dark:text-gray-400 mt-1 font-medium">
              Choose your preferred visual theme for the Crave experience.
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
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] mb-4">
          <div>
            <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <MapPin className="size-4 text-[#b5de28]" />
              <span>Saved Delivery Addresses</span>
            </h3>
            <p className="text-xs text-[#55635a] dark:text-gray-400 mt-0.5 font-medium">
              Manage your doorstep destinations ({savedAddresses.length} saved)
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddAddressModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#b5de28] hover:bg-[#728812] px-3.5 py-1.5 text-xs font-black text-white transition shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add New</span>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {savedAddresses.length === 0 ? (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#dfe4dc] dark:border-[#27342d] p-6 text-center">
              <MapPin className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs font-bold text-[#18201c] dark:text-white">No saved addresses yet</p>
              <p className="text-[11px] text-gray-500 mt-1">Tap Add New to drop a pin or save your address.</p>
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
                      ? 'border-[#b5de28] dark:border-[#d9f447] bg-[#f8fbf4] dark:bg-[#151f19] shadow-xs'
                      : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-[#f0f3eb] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] text-xs font-bold">
                          {addr.label.toLowerCase().includes('work') ? (
                            <Building2 className="size-3.5" />
                          ) : addr.label.toLowerCase().includes('home') ? (
                            <Home className="size-3.5" />
                          ) : (
                            <MapPin className="size-3.5" />
                          )}
                        </span>
                        <span className="font-extrabold text-xs text-[#18201c] dark:text-white capitalize">
                          {addr.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
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
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#55635a] dark:text-gray-300 font-medium my-2.5 line-clamp-2 leading-relaxed">
                      {addr.address}
                    </p>

                    {hasCoords && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-3 flex items-center gap-1">
                        <LocateFixed className="size-2.5 text-[#b5de28]" />
                        <span>{addr.lat!.toFixed(4)}°, {addr.lng!.toFixed(4)}°</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectAddress(addr.address, hasCoords ? { lat: addr.lat!, lng: addr.lng! } : null)}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c]'
                        : 'bg-[#f4f7ed] dark:bg-[#27342d] text-[#18201c] dark:text-white hover:bg-[#e2e7dc] dark:hover:bg-[#34463d]'
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
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white">
              Need help with an ongoing order?
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Call priority helpline at{' '}
              <a href="tel:+919625694673" className="font-bold text-[#18201c] dark:text-[#d9f447] underline">
                -9625694673
              </a>{' '}
              (24/7).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToHelp}
            className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] dark:hover:bg-[#c8e434] transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="size-3.5" />
            <span>Help Center &amp; FAQs</span>
          </button>
          <Link
            href="/policies"
            className="rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition shadow-2xs"
          >
            Policies
          </Link>
        </div>
      </div>
    </div>
  )
}
