'use client'

import { AlertTriangle, Briefcase, Building, Home, Loader2, MapPin } from 'lucide-react'
import type React from 'react'
import { INSTRUCTION_TAGS } from './types'

interface AddressFormViewProps {
  confirmedAddressText: string
  onBackToMap: () => void
  formError: string | null
  addressLabel: 'Home' | 'Work' | 'Other'
  setAddressLabel: (lbl: 'Home' | 'Work' | 'Other') => void
  customLabel: string
  setCustomLabel: (lbl: string) => void
  houseNumber: string
  setHouseNumber: (val: string) => void
  buildingName: string
  setBuildingName: (val: string) => void
  landmark: string
  setLandmark: (val: string) => void
  selectedInstructions: string[]
  onToggleInstruction: (id: string) => void
  isDefaultAddress: boolean
  setIsDefaultAddress: (val: boolean) => void
  isSaving: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function AddressFormView({
  confirmedAddressText,
  onBackToMap,
  formError,
  addressLabel,
  setAddressLabel,
  customLabel,
  setCustomLabel,
  houseNumber,
  setHouseNumber,
  buildingName,
  setBuildingName,
  landmark,
  setLandmark,
  selectedInstructions,
  onToggleInstruction,
  isDefaultAddress,
  setIsDefaultAddress,
  isSaving,
  onSubmit,
}: AddressFormViewProps) {
  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
      {/* Confirmed Location Summary Bar */}
      <div className="flex items-center justify-between rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 p-3.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <MapPin className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Selected Location
            </p>
            <p className="text-xs font-bold text-[#121815] dark:text-white truncate">
              {confirmedAddressText || 'Bengaluru, Karnataka'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToMap}
          className="text-xs font-extrabold text-[#5e8210] dark:text-[#d9f447] hover:underline shrink-0"
        >
          Change
        </button>
      </div>

      {/* Form Error Message */}
      {formError && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Save As Label Buttons */}
      <div>
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
          Save Address As *
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {(['Home', 'Work', 'Other'] as const).map((lbl) => {
            const isSelected = addressLabel === lbl
            return (
              <button
                key={lbl}
                type="button"
                onClick={() => setAddressLabel(lbl)}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] border-transparent shadow-xs'
                    : 'bg-white dark:bg-[#18201c] text-stone-700 dark:text-stone-300 border-black/10 dark:border-white/10 hover:border-black/20'
                }`}
              >
                {lbl === 'Home' ? (
                  <Home className="size-3.5" />
                ) : lbl === 'Work' ? (
                  <Briefcase className="size-3.5" />
                ) : (
                  <Building className="size-3.5" />
                )}
                <span>{lbl}</span>
              </button>
            )
          })}
        </div>

        {addressLabel === 'Other' && (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Gym, Parents' Home, Studio"
            className="mt-2 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
          />
        )}
      </div>

      {/* House / Flat / Block No. */}
      <div>
        <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
          House / Flat / Floor / Block No. *
        </label>
        <input
          type="text"
          required
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          placeholder="e.g. Flat 402, 4th Floor, Block B"
          className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
        />
      </div>

      {/* Building / Apartment Name */}
      <div>
        <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
          Apartment / Building / Society / Road Name
        </label>
        <input
          type="text"
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          placeholder="e.g. Prestige Greenwoods, 12th Main Road"
          className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
        />
      </div>

      {/* Landmark */}
      <div>
        <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
          Nearby Landmark (Optional)
        </label>
        <input
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g. Opposite Forum Mall, Next to Apollo Pharmacy"
          className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
        />
      </div>

      {/* Delivery Instructions Quick Chips */}
      <div>
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
          Delivery Instructions (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {INSTRUCTION_TAGS.map((tag) => {
            const isSelected = selectedInstructions.includes(tag.id)
            const TagIcon = tag.icon

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleInstruction(tag.id)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  isSelected
                    ? 'border-[#5e8210] dark:border-[#d9f447] bg-[#5e8210]/10 dark:bg-[#d9f447]/10 text-[#121815] dark:text-white'
                    : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] text-stone-600 dark:text-stone-400 hover:border-black/20'
                }`}
              >
                <TagIcon className="size-3.5 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <span className="text-[11px] font-bold truncate">{tag.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Default Address Checkbox */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#121815] dark:text-white select-none">
          <input
            type="checkbox"
            checked={isDefaultAddress}
            onChange={(e) => setIsDefaultAddress(e.target.checked)}
            className="size-4 rounded-md accent-[#121815] dark:accent-[#d9f447]"
          />
          <span>Set as default delivery address</span>
        </label>
      </div>

      {/* Submit Action */}
      <div className="pt-3">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] py-3.5 text-xs font-black shadow-lg hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          <span>{isSaving ? 'Saving Address...' : 'Save & Deliver to this Address'}</span>
        </button>
      </div>
    </form>
  )
}
