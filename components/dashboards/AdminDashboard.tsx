'use client'

import React, { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Clock3,
  DollarSign,
  ShieldCheck,
  Store,
  User,
  Users,
  Zap,
  Bike,
  ShoppingBag,
  AlertTriangle,
  X,
  Search,
} from 'lucide-react'
import { useAuth, UserRole } from '@/lib/auth-context'

interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  joinedDate: string
  detail: string
}

interface PaymentReference {
  id: string
  orderId: string
  customerUpi: string
  utrRef: string
  amount: number
  submittedAt: string
  status: 'pending' | 'verified' | 'rejected'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'system'>('users')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Accounts list
  const [accounts, setAccounts] = useState<AccountRecord[]>([
    { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', role: 'customer', status: 'active', joinedDate: '2026-09-12', detail: '14 orders placed' },
    { id: 'u2', name: 'The Green Table (Maya Lin)', email: 'green@table.com', role: 'vendor', status: 'active', joinedDate: '2026-08-01', detail: 'FSSAI Verified' },
    { id: 'u3', name: 'Rajesh Kumar', email: 'rajesh@express.com', role: 'driver', status: 'active', joinedDate: '2026-08-15', detail: 'Ather 450X EV' },
    { id: 'u4', name: 'Sara Vance', email: 'admin@drop.com', role: 'admin', status: 'active', joinedDate: '2026-01-01', detail: 'System Admin' },
    { id: 'u5', name: 'Spice Route Bistro', email: 'spice@route.com', role: 'vendor', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting License Review' },
    { id: 'u6', name: 'Vikram Singh', email: 'vikram@delivery.com', role: 'driver', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting Driving License Verification' },
  ])

  // Payment queue
  const [payments, setPayments] = useState<PaymentReference[]>([
    { id: 'pay_1', orderId: '#DRP-9021', customerUpi: 'alex@upi', utrRef: '428190021389', amount: 867, submittedAt: '5 mins ago', status: 'pending' },
    { id: 'pay_2', orderId: '#DRP-8840', customerUpi: 'priya@okhdfc', utrRef: '992011283741', amount: 960, submittedAt: '20 mins ago', status: 'verified' },
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

  function verifyPayment(id: string, status: 'verified' | 'rejected') {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    )
  }

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = selectedRoleFilter === 'all' || acc.role === selectedRoleFilter
    const matchesQuery = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || acc.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesQuery
  })

  return (
    <div className="min-h-screen bg-[#f8f9f7] pb-24 text-[#18201c]">
      {/* Admin Top Banner */}
      <div className="border-b border-[#e5e9e1] bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-purple-100 text-purple-800 font-bold">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-900 border border-purple-200">
                  Admin Command Center
                </span>
                <span className="text-xs font-mono text-[#737e77]">Key: {user?.adminCode || 'DROP-SYS-8890'}</span>
              </div>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
                Platform Administration 🛡️
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-[#f0f3eb] p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('users')}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === 'users' ? 'bg-white text-[#18201c] shadow-sm' : 'text-[#647069]'
              }`}
            >
              User Accounts ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                activeTab === 'payments' ? 'bg-white text-[#18201c] shadow-sm' : 'text-[#647069]'
              }`}
            >
              Payment Review
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {payments.filter((p) => p.status === 'pending').length}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Network Metrics Overview Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Total Platform Revenue</p>
            <p className="mt-1 text-2xl font-bold text-purple-800">₹4,28,900</p>
            <p className="mt-1 text-[11px] text-[#737e77]">Platform commission: 15%</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Registered Users</p>
            <p className="mt-1 text-2xl font-bold text-[#18201c]">12,480</p>
            <p className="mt-1 text-[11px] text-[#737e77]">Across 4 user roles</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Active Kitchen Vendors</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">340 Partners</p>
            <p className="mt-1 text-[11px] text-[#737e77]">2 pending approvals</p>
          </div>
          <div className="rounded-2xl border border-[#e2e7dc] bg-white p-4">
            <p className="text-[11px] font-bold uppercase text-[#737e77]">Active Delivery Fleet</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">185 Drivers</p>
            <p className="mt-1 text-[11px] text-[#737e77]">94% electric fleet</p>
          </div>
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <h3 className="text-xl font-bold">Registered Platform Users</h3>
                <p className="text-xs text-[#737e77]">
                  Manage accounts across Customer, Vendor, Driver, and Admin roles.
                </p>
              </div>

              {/* Filter controls */}
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

            {/* Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 text-gray-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="pb-3">User / Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Role Type</th>
                    <th className="pb-3">Account Status</th>
                    <th className="pb-3">Detail</th>
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
        )}

        {/* Payment Verification Queue */}
        {activeTab === 'payments' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold">UPI Payment References Queue</h3>
            <p className="text-xs text-[#737e77] mt-0.5">
              Review customer-submitted 12-digit UTR numbers before releasing funds to vendors.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {payments.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 p-4 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#18201c]">{p.orderId}</span>
                      <span className="text-xs text-gray-500 font-mono">UTR: {p.utrRef}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">
                        {p.submittedAt}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Customer VPA: {p.customerUpi}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-bold text-base text-[#18201c]">₹{p.amount}</span>
                    {p.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => verifyPayment(p.id, 'verified')}
                          className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          Approve Payment
                        </button>
                        <button
                          onClick={() => verifyPayment(p.id, 'rejected')}
                          className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                        >
                          Reject / Flag
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          p.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status === 'verified' ? 'Verified & Paid' : 'Flagged as Fraud'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
