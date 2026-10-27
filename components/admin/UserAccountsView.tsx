'use client'

import { Crown, Edit3, Plus, ShieldCheck, Store, Trash2, Users, Zap } from 'lucide-react'
import { AccountRecord, VendorStore } from './types'

interface UserAccountsViewProps {
  userTab: 'vendors' | 'customers' | 'drivers' | 'admins'
  vendorAccounts: AccountRecord[]
  customerAccounts: AccountRecord[]
  driverAccounts: AccountRecord[]
  adminAccounts: AccountRecord[]
  vendorsList: VendorStore[]
  onOpenAddVendor: () => void
  onOpenAddDriver: () => void
  onEditAccount: (acc: AccountRecord) => void
  onToggleStatus: (id: string, currentStatus: string) => void
  onDeleteAccount: (target: { id: string; name: string; email?: string }) => void
}

export default function UserAccountsView({
  userTab,
  vendorAccounts,
  customerAccounts,
  driverAccounts,
  adminAccounts,
  vendorsList,
  onOpenAddVendor,
  onOpenAddDriver,
  onEditAccount,
  onToggleStatus,
  onDeleteAccount,
}: UserAccountsViewProps) {
  const topSpenders = [...customerAccounts]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5)

  if (userTab === 'vendors') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#18201c] dark:text-white">Registered Store Vendors</h3>
            <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">
              Admin-only restaurant onboarding. Manage profiles, alter pricing, or access menus.
            </p>
          </div>
          <button
            onClick={onOpenAddVendor}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-3.5 py-2 text-xs font-extrabold shadow-sm hover:bg-[#2e3a32] dark:hover:bg-[#c2dc3a] transition w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5 text-white dark:text-[#121815]" /> + Onboard New Store
          </button>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 sm:hidden">
          {vendorAccounts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-6 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
              No vendor stores currently registered in database.
            </div>
          ) : (
            vendorAccounts.map((account) => {
              const isXP = account.vendorType === 'XP Store' || account.detail?.toLowerCase().includes('xp')
              return (
                <div
                  key={account.id}
                  className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-4 text-[#18201c] dark:text-white space-y-3 shadow-sm dark:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`grid size-9 place-items-center rounded-xl shrink-0 font-bold ${
                          isXP
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        <Store className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{account.restaurantName || account.detail}</p>
                        <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4] truncate">
                          {account.name} · <span className="font-mono">{account.email}</span>
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      {isXP ? 'XP Store' : 'Restaurant'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#25332a]">
                    <button
                      onClick={() => onEditAccount(account)}
                      className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="size-3" /> Edit
                    </button>
                    <button
                      onClick={() => onToggleStatus(account.id, account.status)}
                      className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                    >
                      {account.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() =>
                        onDeleteAccount({
                          id: account.id,
                          name: account.restaurantName || account.detail || account.name,
                          email: account.email,
                        })
                      }
                      className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block table-wrapper rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] shadow-sm dark:shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="border-b border-gray-200 dark:border-[#25332a] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-[#9eb3a4] font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Store / Business Name</th>
                <th className="px-4 py-3.5">Owner Account &amp; Email</th>
                <th className="px-4 py-3.5">Cuisine &amp; Contact</th>
                <th className="px-4 py-3.5">Pricing Model</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#25332a]">
              {vendorAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
                    No vendor stores found. Click &apos;+ Onboard New Store&apos; to register one.
                  </td>
                </tr>
              ) : (
                vendorAccounts.map((account) => {
                  const isXP = account.vendorType === 'XP Store' || account.detail?.toLowerCase().includes('xp')
                  return (
                    <tr key={account.id} className="hover:bg-gray-50/80 dark:hover:bg-[#121815]/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`grid size-8 place-items-center rounded-lg font-bold shrink-0 ${
                              isXP
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}
                          >
                            <Store className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#18201c] dark:text-white">
                              {account.restaurantName || account.detail}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">
                              {isXP ? 'XP Quick Store' : 'Restaurant Kitchen'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 dark:text-[#9eb3a4]">
                        <p className="font-semibold text-[#18201c] dark:text-white">{account.name}</p>
                        <p className="font-mono text-[11px]">{account.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#18201c] dark:text-white">{account.cuisine || 'Multi-Cuisine'}</p>
                        <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">{account.phone || 'Phone N/A'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {account.commissionRate}% Commission
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`text-xs font-bold uppercase ${
                            account.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onEditAccount(account)}
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="size-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => onToggleStatus(account.id, account.status)}
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                          >
                            {account.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() =>
                              onDeleteAccount({
                                id: account.id,
                                name: account.restaurantName || account.detail || account.name,
                                email: account.email,
                              })
                            }
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (userTab === 'customers') {
    return (
      <div className="space-y-6">
        {topSpenders.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-5 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#25332a] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-amber-100 dark:bg-[#d9f447] text-amber-800 dark:text-[#121815]">
                  <Crown className="size-5" />
                </span>
                <div>
                  <h4 className="text-base font-extrabold text-[#18201c] dark:text-white">VIP Spending Customers</h4>
                  <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">
                    Top customer accounts ordered by lifetime spend
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Active Sync
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {topSpenders.slice(0, 3).map((cust, idx) => (
                <div
                  key={cust.id}
                  className="rounded-xl bg-gray-50 dark:bg-[#121815] p-3.5 border border-gray-200 dark:border-[#25332a]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-100 dark:bg-[#d9f447] px-2 py-0.5 text-[9px] font-black text-amber-800 dark:text-[#121815]">
                      #{idx + 1} SPENDER
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {cust.totalOrders} Orders
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-sm text-[#18201c] dark:text-white truncate">{cust.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4] truncate">{cust.email}</p>
                  <p className="mt-1.5 text-lg font-extrabold text-[#18201c] dark:text-[#d9f447]">
                    ₹{cust.totalSpent?.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Directory Table */}
        <div className="table-wrapper rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] shadow-sm dark:shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="border-b border-gray-200 dark:border-[#25332a] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-[#9eb3a4] font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Customer Name</th>
                <th className="px-4 py-3.5">Email &amp; Contact</th>
                <th className="px-4 py-3.5">Delivery Address</th>
                <th className="px-4 py-3.5">Total Spend</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#25332a]">
              {customerAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
                    No customer accounts currently stored in database users table.
                  </td>
                </tr>
              ) : (
                customerAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50/80 dark:hover:bg-[#121815]/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#18201c] dark:text-white">{account.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">Joined: {account.joinedDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-[#9eb3a4]">
                      <p className="font-semibold text-[#18201c] dark:text-white">{account.email}</p>
                      <p className="text-[11px]">{account.phone || 'Phone N/A'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-[#9eb3a4] truncate max-w-[200px]">
                      {account.address || 'Bengaluru, India'}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#18201c] dark:text-[#d9f447]">
                      ₹{account.totalSpent?.toLocaleString('en-IN')} ({account.totalOrders} orders)
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold uppercase ${
                          account.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditAccount(account)}
                          className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="size-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => onToggleStatus(account.id, account.status)}
                          className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                        >
                          {account.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (userTab === 'drivers') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#18201c] dark:text-white">Registered Delivery Partners</h3>
            <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">
              Admin onboarding. View fleet accounts, vehicle details, license numbers, and active status.
            </p>
          </div>
          <button
            onClick={onOpenAddDriver}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-3.5 py-2 text-xs font-bold shadow-sm hover:bg-[#2e3a32] dark:hover:bg-[#cbe338] transition cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="size-3.5 text-white dark:text-[#121815]" /> + Add Driver
          </button>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 sm:hidden">
          {driverAccounts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-6 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
              No driver accounts found. Click &apos;+ Add Driver&apos; to onboard one.
            </div>
          ) : (
            driverAccounts.map((driver) => (
              <div
                key={driver.id}
                className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-4 text-[#18201c] dark:text-white space-y-3 shadow-sm dark:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-9 place-items-center rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold shrink-0">
                      <Zap className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{driver.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4] truncate">
                        {driver.email} · {driver.phone || 'Phone N/A'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase shrink-0 ${
                      driver.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                    }`}
                  >
                    {driver.status === 'active' ? 'Active' : driver.status}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#25332a]">
                  <button
                    onClick={() => onEditAccount(driver)}
                    className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="size-3" /> Edit
                  </button>
                  <button
                    onClick={() => onToggleStatus(driver.id, driver.status)}
                    className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                  >
                    {driver.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => onDeleteAccount({ id: driver.id, name: driver.name, email: driver.email })}
                    className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block table-wrapper rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] shadow-sm dark:shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="border-b border-gray-200 dark:border-[#25332a] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-[#9eb3a4] font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Driver Name</th>
                <th className="px-4 py-3.5">Contact Email &amp; Phone</th>
                <th className="px-4 py-3.5">Vehicle &amp; License Details</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#25332a]">
              {driverAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
                    No driver accounts found. Click &apos;+ Add Driver&apos; to onboard one.
                  </td>
                </tr>
              ) : (
                driverAccounts.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50/80 dark:hover:bg-[#121815]/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold shrink-0">
                          <Zap className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#18201c] dark:text-white">{driver.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">Joined: {driver.joinedDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-[#9eb3a4]">
                      <p className="font-semibold text-[#18201c] dark:text-white">{driver.email}</p>
                      <p className="text-[11px]">{driver.phone || 'Phone N/A'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[#18201c] dark:text-white font-semibold">
                      <span className="inline-block rounded-md bg-gray-100 dark:bg-[#121815] px-2 py-0.5 text-xs text-gray-800 dark:text-emerald-300 font-medium border border-gray-200 dark:border-[#25332a]">
                        {driver.detail}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold uppercase ${
                          driver.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {driver.status === 'active' ? 'Active Partner' : driver.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEditAccount(driver)}
                          className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="size-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => onToggleStatus(driver.id, driver.status)}
                          className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                        >
                          {driver.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => onDeleteAccount({ id: driver.id, name: driver.name, email: driver.email })}
                          className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Admins subtab
  return (
    <div className="table-wrapper rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] shadow-sm dark:shadow-xl overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse min-w-[800px]">
        <thead className="border-b border-gray-200 dark:border-[#25332a] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-[#9eb3a4] font-semibold uppercase text-[10px] tracking-wider">
          <tr>
            <th className="px-4 py-3.5">Administrator</th>
            <th className="px-4 py-3.5">Email Address</th>
            <th className="px-4 py-3.5">System Privilege</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-[#25332a]">
          {adminAccounts.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-xs text-gray-500 dark:text-[#9eb3a4]">
                No administrative accounts found.
              </td>
            </tr>
          ) : (
            adminAccounts.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50/80 dark:hover:bg-[#121815]/70 transition-colors">
                <td className="px-4 py-3.5 font-bold">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold shrink-0">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#18201c] dark:text-white">{admin.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-[#9eb3a4]">Joined: {admin.joinedDate}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-gray-500 dark:text-[#9eb3a4]">{admin.email}</td>
                <td className="px-4 py-3.5 text-[#18201c] dark:text-white font-semibold">
                  <span className="inline-block rounded-md bg-purple-100 dark:bg-purple-500/20 px-2 py-0.5 text-xs text-purple-800 dark:text-purple-300 font-medium">
                    Super Administrator
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {admin.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEditAccount(admin)}
                    className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
