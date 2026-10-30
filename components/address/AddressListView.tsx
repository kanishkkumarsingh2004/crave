'use client'

import {
  Briefcase,
  Building,
  Check,
  Edit3,
  Home,
  Loader2,
  MapPin,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import type { AddressItem } from './types'

interface AddressListViewProps {
  addresses: AddressItem[]
  selectedAddressId: string | null
  isLoadingList: boolean
  onAddNew: () => void
  onSelectAddress: (address: AddressItem) => void
  onStartEdit: (address: AddressItem) => void
  onSetDefault: (id: string) => void
  onDeleteAddress: (id: string) => Promise<void>
}

export default function AddressListView({
  addresses,
  selectedAddressId,
  isLoadingList,
  onAddNew,
  onSelectAddress,
  onStartEdit,
  onSetDefault,
  onDeleteAddress,
}: AddressListViewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await onDeleteAddress(deletingId)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
      {/* Top Add Address CTA */}
      <button
        type="button"
        onClick={onAddNew}
        className="w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-[#5e8210]/40 dark:border-[#d9f447]/30 bg-[#5e8210]/5 dark:bg-[#d9f447]/5 p-4 text-[#5e8210] dark:text-[#d9f447] hover:bg-[#5e8210]/10 dark:hover:bg-[#d9f447]/10 transition group"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] group-hover:scale-105 transition">
            <Plus className="size-5 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <p className="font-extrabold text-sm text-[#121815] dark:text-white">
              Add New Delivery Address
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Search area, drop map pin &amp; save doorstep details
            </p>
          </div>
        </div>
        <span className="text-xs font-black uppercase tracking-wider bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-3 py-1.5 rounded-xl shadow-xs">
          Add New
        </span>
      </button>

      {/* List of Saved Addresses */}
      {isLoadingList ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-3">
          <Loader2 className="size-7 animate-spin text-[#5e8210] dark:text-[#d9f447]" />
          <p className="text-xs font-bold">Loading your saved addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6">
          <div className="size-12 rounded-2xl bg-black/5 dark:bg-white/5 grid place-items-center mx-auto mb-3 text-stone-400">
            <MapPin className="size-6" />
          </div>
          <h4 className="font-bold text-sm text-[#121815] dark:text-white">
            No saved addresses found
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Add your home, office, or other locations for 1-click checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 px-1">
            <span>YOUR SAVED LOCATIONS ({addresses.length})</span>
          </div>

          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id
            const isDefault = Boolean(addr.is_default)

            return (
              <div
                key={addr.id}
                className={`group relative rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-[#121815] dark:border-[#d9f447] bg-[#121815]/[0.03] dark:bg-white/[0.05] ring-2 ring-black/10 dark:ring-[#d9f447]/20 shadow-xs'
                    : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] hover:border-black/25 dark:hover:border-white/25'
                }`}
              >
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer"
                  onClick={() => onSelectAddress(addr)}
                >
                  <div
                    className={`size-10 rounded-2xl grid place-items-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815]'
                        : 'bg-black/5 dark:bg-white/5 text-[#121815] dark:text-white'
                    }`}
                  >
                    {addr.label === 'Home' ? (
                      <Home className="size-4.5" />
                    ) : addr.label === 'Work' ? (
                      <Briefcase className="size-4.5" />
                    ) : (
                      <Building className="size-4.5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-[#121815] dark:text-white">
                        {addr.label}
                      </span>
                      {isDefault && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#5e8210]/15 dark:bg-[#d9f447]/20 text-[#5e8210] dark:text-[#d9f447] px-2 py-0.5 rounded-md border border-[#5e8210]/20 dark:border-[#d9f447]/30">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed line-clamp-2">
                      {addr.address}
                    </p>
                  </div>
                </div>

                {/* Actions: Deliver Here, Edit, Default, Delete */}
                <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t border-black/[0.04] dark:border-white/[0.04] sm:border-t-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectAddress(addr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815]'
                        : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-200 hover:bg-black/10'
                    }`}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    <span>{isSelected ? 'Selected' : 'Deliver Here'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartEdit(addr)}
                    className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-500 hover:text-black dark:hover:text-white hover:bg-black/10 transition"
                    title="Edit address"
                    aria-label={`Edit ${addr.label}`}
                  >
                    <Edit3 className="size-3.5" />
                  </button>

                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => onSetDefault(addr.id)}
                      className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-400 hover:text-amber-500 hover:bg-black/10 transition"
                      title="Set as default address"
                      aria-label={`Set ${addr.label} as default`}
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeletingId(addr.id)}
                    className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    title="Delete address"
                    aria-label={`Delete ${addr.label}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#18201c] rounded-3xl p-6 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 grid place-items-center mx-auto">
              <Trash2 className="size-6" />
            </div>
            <div className="text-center">
              <h4 className="font-extrabold text-base text-[#121815] dark:text-white">
                Delete this address?
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Are you sure you want to remove this saved address from your account?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
