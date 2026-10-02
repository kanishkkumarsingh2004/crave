'use client'

import React from 'react'

export default function AdminSettingsPage() {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm max-w-2xl">
      <h3 className="text-xl font-bold">Admin Security & Platform Settings</h3>
      <p className="text-xs text-[#737e77] mt-0.5">Configure platform commission rate, default delivery radius, and security parameters.</p>
      
      <div className="mt-6 flex flex-col gap-4 text-xs">
        <div>
          <label className="font-bold text-[#18201c]">Platform Commission Fee (%)</label>
          <input type="number" defaultValue="15" className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-bold" />
        </div>
        <div>
          <label className="font-bold text-[#18201c]">Default Delivery Radius (km)</label>
          <input type="number" defaultValue="8" className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none font-bold" />
        </div>
        <button className="mt-2 rounded-full bg-[#18201c] py-2.5 font-bold text-white shadow-md hover:bg-[#323d36]">
          Save Security Settings
        </button>
      </div>
    </div>
  )
}
