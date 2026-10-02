'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { UserRole } from '@/lib/auth-context'

interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  joinedDate: string
  detail: string
}

export default function AdminUsersPage() {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [accounts, setAccounts] = useState<AccountRecord[]>([
    { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', role: 'customer', status: 'active', joinedDate: '2026-09-12', detail: '14 drops completed' },
    { id: 'u2', name: 'The Green Table (Maya Lin)', email: 'green@table.com', role: 'vendor', status: 'active', joinedDate: '2026-08-01', detail: 'FSSAI Verified #1122' },
    { id: 'u3', name: 'Rajesh Kumar', email: 'rajesh@express.com', role: 'driver', status: 'active', joinedDate: '2026-08-15', detail: 'Ather 450X EV Bike' },
    { id: 'u4', name: 'Sara Vance', email: 'admin@crave.com', role: 'admin', status: 'active', joinedDate: '2026-01-01', detail: 'Master System Admin' },
    { id: 'u5', name: 'Spice Route Bistro', email: 'spice@route.com', role: 'vendor', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting License Review' },
    { id: 'u6', name: 'Vikram Singh', email: 'vikram@delivery.com', role: 'driver', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting Driving License Verification' },
  ])

  function toggleAccountStatus(id: string) {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const nextStatus = acc.status === 'active' ? 'suspended' : 'active'
          return { ...acc, status: nextStatus }
        }
        return acc
      })
    )
  }

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = selectedRoleFilter === 'all' || acc.role === selectedRoleFilter
    const matchesQuery = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || acc.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesQuery
  })

  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
        <div>
          <h3 className="text-xl font-bold">Registered User Accounts</h3>
          <p className="text-xs text-[#737e77]">Manage accounts across Customer, Vendor, Driver, and Admin roles.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-[#dfe4dc] py-1.5 pl-8 pr-3 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            {['all', 'customer', 'vendor', 'driver', 'admin'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition ${
                  selectedRoleFilter === r ? 'bg-[#18201c] text-white' : 'text-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-gray-200 text-gray-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="pb-3">User / Name</th>
              <th className="pb-3">Email Address</th>
              <th className="pb-3">Role Type</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Details</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAccounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-50/50">
                <td className="py-3.5 font-bold text-[#18201c]">{acc.name}</td>
                <td className="py-3.5 text-gray-600">{acc.email}</td>
                <td className="py-3.5">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-800">
                    {acc.role}
                  </span>
                </td>
                <td className="py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      acc.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : acc.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {acc.status}
                  </span>
                </td>
                <td className="py-3.5 text-gray-500">{acc.detail}</td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => toggleAccountStatus(acc.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                      acc.status === 'active'
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {acc.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
