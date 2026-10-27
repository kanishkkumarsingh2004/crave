'use client'

import React from 'react'
import { ChevronDown, MapPin } from 'lucide-react'

interface AddressPillProps {
  deliveryAddress: string
  userAddress?: string
  onClick: () => void
}

export function AddressPill({ deliveryAddress, userAddress, onClick }: AddressPillProps) {
  const displayAddress =
    deliveryAddress?.split(',')[0] || userAddress?.split(',')[0] || 'Select Location'

  return (
    <>
      {/* Desktop Deliver-To Pill */}
      <button
        type="button"
        onClick={onClick}
        className="hidden sm:flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.04] px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer max-w-[210px] lg:max-w-[280px]"
        title="Change delivery location"
      >
        <div className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#d9f447] shrink-0">
          <MapPin className="size-3.5" />
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1 leading-none text-[8px] font-black uppercase tracking-wider text-gray-400">
            <span>DELIVER TO</span>
            <span className="text-[#86a018] dark:text-[#d9f447] font-bold group-hover:underline">
              (Change)
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-xs font-bold text-[#18201c] dark:text-white truncate mt-0.5">
            <span className="truncate">{displayAddress}</span>
            <ChevronDown className="size-3 text-gray-400 shrink-0" />
          </div>
        </div>
      </button>

      {/* Mobile Deliver-To Pill */}
      <button
        type="button"
        onClick={onClick}
        className="sm:hidden flex items-center gap-1.5 rounded-full bg-gray-100/90 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/10 px-2.5 py-1 text-left min-w-0 max-w-[155px] xs:max-w-[190px] hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
        title="Change delivery location"
      >
        <MapPin className="size-3 text-emerald-600 dark:text-[#d9f447] shrink-0" />
        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">
          {displayAddress}
        </span>
        <ChevronDown className="size-2.5 text-gray-400 shrink-0" />
      </button>
    </>
  )
}
