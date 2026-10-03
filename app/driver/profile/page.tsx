'use client'

import { useAuth } from '@/lib/auth-context'

export default function DriverProfilePage() {
  const { user } = useAuth()

  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h3 className="text-xl font-bold text-[#18201c]">Driver Profile & Vehicle Specs</h3>
        <p className="text-xs text-gray-500">
          Registered delivery partner vehicle details and documents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 text-xs flex flex-col gap-2">
          <p className="font-bold text-gray-700 text-xs uppercase">Vehicle Info</p>
          <p className="font-semibold text-sm text-[#18201c]">{user?.vehicleType || 'Commercial EV Delivery Scooter'}</p>
          <p className="text-gray-600">Reg No: {user?.vehicleNo || 'EV Fleet Vehicle'}</p>
          <p className="text-gray-600">Type: Commercial Two-Wheeler</p>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 text-xs flex flex-col gap-2">
          <p className="font-bold text-gray-700 text-xs uppercase">Partner Status</p>
          <p className="font-semibold text-sm text-emerald-700">
            Active Verified Driver ({user?.name || 'Driver Partner'})
          </p>
          <p className="text-gray-600">Zone: Indiranagar & Koramangala, Bangalore</p>
          <p className="text-gray-600">KYC Status: Verified</p>
        </div>
      </div>
    </div>
  )
}
