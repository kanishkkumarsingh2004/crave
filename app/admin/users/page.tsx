'use client'

import { CheckCircle2, ChevronRight, Plus, Search, SlidersHorizontal, Store, Trash2, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { UserRole } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type AccountStatus = 'active' | 'pending' | 'suspended'

interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: AccountStatus
  joined: string
  detail: string
  vendorModel?: 'commission' | 'markup'
  commissionRate?: number
}

export default function AdminUsersPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    role: 'customer' as UserRole,
    phone: '',
    detail: '',
  })

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false })
        if (users) {
          setAccounts(
            users.map((user) => ({
              id: user.id,
              name: user.name ?? 'Unknown User',
              email: user.email ?? 'noreply@example.com',
              role: (user.role as UserRole) ?? 'customer',
              status: 'active',
              joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently',
              detail: user.address ?? 'Registered account',
              vendorModel: user.payment_model === 'markup' ? 'markup' : 'commission',
              commissionRate: Number(user.commission_rate ?? 15),
            }))
          )
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }

    loadUsers()
  }, [])

  const filtered = accounts.filter((acc) => {
    const matchesRole = roleFilter === 'all' || acc.role === roleFilter
    const haystack = `${acc.name} ${acc.email}`.toLowerCase()
    const matchesQuery = haystack.includes(query.toLowerCase())
    return matchesRole && matchesQuery
  })

  const handleCreate = async () => {
    if (!draft.name || !draft.email) return

    const newAccount: AccountRecord = {
      id: `user_${Date.now()}`,
      name: draft.name,
      email: draft.email,
      role: draft.role,
      status: 'active',
      joined: 'Today',
      detail: draft.detail || 'New account created',
      vendorModel: draft.role === 'vendor' ? 'commission' : undefined,
      commissionRate: 15,
    }

    setAccounts((prev) => [newAccount, ...prev])

    try {
      await supabase.from('users').insert([
        {
          id: newAccount.id,
          name: newAccount.name,
          email: newAccount.email,
          role: newAccount.role,
          phone: draft.phone || null,
          address: 'Bengaluru, India',
        },
      ])
    } catch (error) {
      console.error('Failed to save user:', error)
    }

    setAddOpen(false)
    setDraft({ name: '', email: '', role: 'customer', phone: '', detail: '' })
  }

  const toggleStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((account) => 
        account.id === id
          ? {
              ...account,
              status: account.status === 'active' ? 'suspended' : 'active',
            }
          : account
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#f0f3ec] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#18201c]">Registered accounts</h2>
            <p className="text-xs text-[#737e77]">Search, review, and manage user access</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#86a018] sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
              {(['all', 'customer', 'vendor', 'driver', 'admin'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setRoleFilter(item)}
                  className={`rounded-full px-3 py-1.5 font-bold capitalize ${
                    roleFilter === item ? 'bg-[#18201c] text-white' : 'text-gray-600'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="size-4" /> Add user
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-bold">User</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Payment model</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No accounts match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-full bg-[#f1f6d9] text-[#6a8014]">
                          {account.role === 'vendor' ? <Store className="size-4" /> : <Users className="size-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#18201c]">{account.name}</div>
                          <div className="text-[11px] text-gray-500">{account.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold uppercase text-[#18201c]">{account.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          account.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : account.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {account.vendorModel === 'markup'
                        ? 'Price markup model'
                        : account.vendorModel === 'commission'
                          ? `Commission ${account.commissionRate ?? 15}%`
                          : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(account.id)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700"
                        >
                          {account.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button className="rounded-full border border-gray-200 p-2 text-gray-600">
                          <ChevronRight className="size-3.5" />
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

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#18201c]">Add new user</h3>
                <p className="text-xs text-gray-500">Create a user or vendor account</p>
              </div>
              <button onClick={() => setAddOpen(false)} className="rounded-full bg-gray-100 p-2 text-gray-600">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Full name"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#86a018]"
                />
                <input
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  placeholder="Email address"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={draft.role}
                  onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#86a018]"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  placeholder="Phone number"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#86a018]"
                />
              </div>

              <textarea
                value={draft.detail}
                onChange={(event) => setDraft({ ...draft, detail: event.target.value })}
                placeholder="Profile details / vendor extra info"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#86a018]"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setAddOpen(false)} className="rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700">
                  Cancel
                </button>
                <button onClick={handleCreate} className="rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white">
                  Save account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}