'use client'

import React, { useState } from 'react'
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  MenuSquare,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Store,
  UserCheck,
  Users,
  X,
  Zap,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
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
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'system' | 'settings'>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Accounts data
  const [accounts, setAccounts] = useState<AccountRecord[]>([
    { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', role: 'customer', status: 'active', joinedDate: '2026-09-12', detail: '14 drops completed' },
    { id: 'u2', name: 'The Green Table (Maya Lin)', email: 'green@table.com', role: 'vendor', status: 'active', joinedDate: '2026-08-01', detail: 'FSSAI Verified #1122' },
    { id: 'u3', name: 'Rajesh Kumar', email: 'rajesh@express.com', role: 'driver', status: 'active', joinedDate: '2026-08-15', detail: 'Ather 450X EV Bike' },
    { id: 'u4', name: 'Sara Vance', email: 'admin@drop.com', role: 'admin', status: 'active', joinedDate: '2026-01-01', detail: 'Master System Admin' },
    { id: 'u5', name: 'Spice Route Bistro', email: 'spice@route.com', role: 'vendor', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting License Review' },
    { id: 'u6', name: 'Vikram Singh', email: 'vikram@delivery.com', role: 'driver', status: 'pending', joinedDate: '2026-10-02', detail: 'Awaiting Driving License Verification' },
  ])

  // Payment queue
  const [payments, setPayments] = useState<PaymentReference[]>([
    { id: 'pay_1', orderId: '#DRP-9021', customerUpi: 'alex@upi', utrRef: '428190021389', amount: 867, submittedAt: '5 mins ago', status: 'pending' },
    { id: 'pay_2', orderId: '#DRP-8840', customerUpi: 'priya@okhdfc', utrRef: '992011283741', amount: 960, submittedAt: '20 mins ago', status: 'verified' },
    { id: 'pay_3', orderId: '#DRP-8712', customerUpi: 'karan@icici', utrRef: '109283746519', amount: 289, submittedAt: '45 mins ago', status: 'verified' },
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

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length

  const navItems = [
    { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard, badge: null },
    { id: 'users', label: 'User Accounts', icon: Users, badge: accounts.length.toString() },
    { id: 'payments', label: 'Payment Review Queue', icon: CreditCard, badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending` : null },
    { id: 'system', label: 'System Health Logs', icon: Activity, badge: 'Live' },
    { id: 'settings', label: 'Admin Settings', icon: Settings, badge: null },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8f9f7] text-[#18201c]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#18201c]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Admin Sidebar Navigation Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-[#e3e8de] bg-[#18201c] text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6 p-5">
          {/* Sidebar Top Branding */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shadow-[0_4px_20px_rgba(217,244,71,0.4)]">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">drop<span className="text-[#d9f447]">.</span> Admin</h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">Command Center</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any)
                    setSidebarOpen(false)
                  }}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition ${
                    isActive
                      ? 'bg-[#d9f447] text-[#18201c] shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4 ${isActive ? 'text-[#18201c]' : 'text-[#d9f447]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isActive ? 'bg-[#18201c] text-white' : 'bg-white/15 text-[#d9f447]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Profile */}
        <div className="border-t border-white/10 p-5">
          <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-purple-950 text-purple-300 font-bold border border-purple-800">
                SV
              </span>
              <div>
                <p className="text-xs font-bold text-white">{user?.name || 'Sara Vance'}</p>
                <p className="text-[10px] text-white/60">Master Admin</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="grid size-8 place-items-center rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e8de] bg-white/90 px-5 py-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white lg:hidden"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#18201c] capitalize">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-xs text-[#737e77]">
                Live network controls & security monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-900">
              <ShieldCheck className="size-3.5 text-purple-700" /> Key: {user?.adminCode || 'DROP-SYS-8890'}
            </span>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <div className="p-5 lg:p-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Total Network Sales</span>
                    <span className="grid size-8 place-items-center rounded-xl bg-purple-100 text-purple-800">
                      <DollarSign className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-[#18201c]">₹4,28,900</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="size-3.5" /> +24% growth this week
                  </p>
                </div>

                <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Active Registered Users</span>
                    <span className="grid size-8 place-items-center rounded-xl bg-blue-100 text-blue-800">
                      <Users className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-[#18201c]">12,480</p>
                  <p className="mt-1 text-xs text-[#737e77]">Across 4 ecosystem roles</p>
                </div>

                <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Verified Kitchens</span>
                    <span className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
                      <Store className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-amber-700">340 Partners</p>
                  <p className="mt-1 text-xs text-[#737e77]">2 awaiting approval</p>
                </div>

                <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Delivery Fleet</span>
                    <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Zap className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-emerald-700">185 Active</p>
                  <p className="mt-1 text-xs text-[#737e77]">94% Electric Fleet</p>
                </div>
              </div>

              {/* Action Quick Links */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
                    <h3 className="font-bold text-base text-[#18201c]">Pending Verification Queue</h3>
                    <button onClick={() => setActiveTab('payments')} className="text-xs font-bold text-[#86a018] hover:underline flex items-center gap-1">
                      View All <ArrowUpRight className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    {payments.filter((p) => p.status === 'pending').map((pay) => (
                      <div key={pay.id} className="flex items-center justify-between rounded-2xl bg-[#f8f9f6] p-3 text-xs">
                        <div>
                          <p className="font-bold text-[#18201c]">{pay.orderId} · UTR: {pay.utrRef}</p>
                          <p className="text-[11px] text-gray-500">Customer VPA: {pay.customerUpi}</p>
                        </div>
                        <span className="font-bold text-sm text-[#18201c]">₹{pay.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
                    <h3 className="font-bold text-base text-[#18201c]">Role Distribution breakdown</h3>
                    <button onClick={() => setActiveTab('users')} className="text-xs font-bold text-[#86a018] hover:underline flex items-center gap-1">
                      Manage Accounts <ArrowUpRight className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Customers / End Users</span>
                        <span>11,200 (89%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[89%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Kitchen Vendors</span>
                        <span>340 (3%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                        <div className="h-full bg-amber-500 w-[3%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span>Delivery Drivers</span>
                        <span>185 (2%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                        <div className="h-full bg-blue-500 w-[2%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER ACCOUNTS MANAGEMENT */}
          {activeTab === 'users' && (
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
          )}

          {/* TAB 3: PAYMENT REVIEW */}
          {activeTab === 'payments' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">UPI Payment References Queue</h3>
              <p className="text-xs text-[#737e77] mt-0.5">Review customer-submitted 12-digit UTR numbers before releasing funds to vendors.</p>

              <div className="mt-6 flex flex-col gap-4">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 p-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#18201c]">{p.orderId}</span>
                        <span className="text-xs text-gray-500 font-mono">UTR: {p.utrRef}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">{p.submittedAt}</span>
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
                            p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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

          {/* TAB 4: SYSTEM HEALTH */}
          {activeTab === 'system' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">System Health & Live Monitoring</h3>
              <p className="text-xs text-[#737e77] mt-0.5">Real-time API gateway status, JWT token verifications, and audit logs.</p>
              
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-xs font-bold text-emerald-900">API Gateway Status</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">Operational (99.98%)</p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs font-bold text-blue-900">JWT Authentication</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">Active & Secured</p>
                </div>
                <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
                  <p className="text-xs font-bold text-purple-900">Database Connection</p>
                  <p className="text-lg font-bold text-purple-700 mt-1">Healthy (12ms latency)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm max-w-2xl">
              <h3 className="text-xl font-bold">Admin Platform Settings</h3>
              <p className="text-xs text-[#737e77] mt-0.5">Configure platform commission rate, default delivery radius, and security parameters.</p>
              
              <div className="mt-6 flex flex-col gap-4 text-xs">
                <div>
                  <label className="font-bold text-[#18201c]">Platform Commission Fee (%)</label>
                  <input type="number" defaultValue="15" className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none" />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Default Delivery Radius (km)</label>
                  <input type="number" defaultValue="8" className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 outline-none" />
                </div>
                <button className="mt-2 rounded-full bg-[#18201c] py-2.5 font-bold text-white">Save Security Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
