'use client'

import { useEffect, useState } from 'react'
import { Crown, RefreshCw, Search, ShieldCheck, Store, Users, Utensils, Zap } from 'lucide-react'
import { UserRole } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { useAdminStatsUpdates } from '@/lib/websocket'
import { showBrowserNotification } from '@/lib/notifications/web-notification'
import AddDriverModal from '@/components/admin/AddDriverModal'
import AddVendorModal from '@/components/admin/AddVendorModal'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal'
import EditAccountModal from '@/components/admin/EditAccountModal'
import MenuPricingDrawer from '@/components/admin/MenuPricingDrawer'
import MenuPricingView from '@/components/admin/MenuPricingView'
import UserAccountsView from '@/components/admin/UserAccountsView'
import { AccountRecord, VendorStore } from '@/components/admin/types'

export default function AdminDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTabState] = useState<'users' | 'menu-pricing'>('users')
  const [userTab, setUserTabState] = useState<'vendors' | 'customers' | 'drivers' | 'admins'>(
    'vendors'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Data States
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [vendorsList, setVendorsList] = useState<VendorStore[]>([])
  const [, setLoading] = useState(true)

  // Modal States
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false)
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null)
  const [selectedVendorForMenu, setSelectedVendorForMenu] = useState<VendorStore | null>(null)
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string
    name: string
    email?: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem('crave_admin_active_tab')
      if (savedActive === 'users' || savedActive === 'menu-pricing') {
        setActiveTabState(savedActive)
      }
      const savedUser = localStorage.getItem('crave_admin_user_tab')
      if (savedUser && ['vendors', 'customers', 'drivers', 'admins'].includes(savedUser)) {
        setUserTabState(savedUser as any)
      }
    }
  }, [])

  const setActiveTab = (tab: 'users' | 'menu-pricing') => {
    setActiveTabState(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crave_admin_active_tab', tab)
    }
  }

  const setUserTab = (tab: 'vendors' | 'customers' | 'drivers' | 'admins') => {
    setUserTabState(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crave_admin_user_tab', tab)
    }
  }

  const fetchAccountsAndVendors = async () => {
    try {
      setLoading(true)
      const [resRest, resUsers] = await Promise.all([
        fetch('/api/restaurants?isDarkStore=false', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ])

      const [restaurantsJson, usersJson] = await Promise.all([
        resRest.json().catch(() => ({})),
        resUsers.json().catch(() => ({})),
      ])

      const vendorsData = restaurantsJson.restaurants || []
      const usersData = usersJson.users || []

      const realVendorsList: VendorStore[] = vendorsData.map((r: any) => ({
        id: r.id,
        userId: r.owner_id,
        storeName: r.name || 'Unnamed Store',
        description: r.cuisine,
        address: r.address,
        status: r.is_open ? 'ACTIVE' : 'INACTIVE',
        isOpen: r.is_open ?? true,
        commissionRate: r.commission_rate ?? 15,
        commissionType: r.payment_model || 'COMMISSION',
        bannerUrl: r.image,
        latitude: r.latitude ? Number(r.latitude) : undefined,
        longitude: r.longitude ? Number(r.longitude) : undefined,
        phone: r.phone || undefined,
      }))

      setVendorsList(realVendorsList)

      const combinedAccounts: AccountRecord[] = []

      usersData.forEach((u: any) => {
        if (u.role === 'cravexp_store_vendor') return

        const matchedVendor = realVendorsList.find(
          (v) =>
            (v.userId && v.userId === u.id) ||
            v.id === u.id ||
            (u.restaurant_name &&
              v.storeName &&
              u.restaurant_name.toLowerCase() === v.storeName.toLowerCase()) ||
            (u.name && v.storeName && u.name.toLowerCase() === v.storeName.toLowerCase())
        )

        const isXP =
          matchedVendor?.description?.toLowerCase().includes('xp') ||
          u.cuisine?.toLowerCase().includes('xp')

        const normalizedRole: UserRole =
          u.role === 'user' || u.role === 'customer'
            ? 'customer'
            : u.role === 'rider' || u.role === 'driver'
              ? 'driver'
              : u.role === 'restaurant_vendor' || u.role === 'vendor'
                ? 'vendor'
                : (u.role as UserRole) || 'customer'

        combinedAccounts.push({
          id: u.id,
          name: u.name || 'User Account',
          email: u.email || 'no-email@crave.com',
          role: normalizedRole,
          status: 'active',
          joinedDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recently',
          detail:
            u.role === 'restaurant_vendor' || u.role === 'vendor'
              ? matchedVendor?.storeName || u.restaurant_name || 'Kitchen Vendor'
              : u.role === 'rider' || u.role === 'driver'
                ? `${u.vehicle_type || 'Electric Scooter'}${u.license_plate ? ` · ${u.license_plate}` : ''}`
                : u.role === 'admin'
                  ? 'System Super Admin'
                  : u.address || 'Registered Customer',
          phone: u.phone || matchedVendor?.phone || undefined,
          address: u.address || matchedVendor?.address || undefined,
          restaurantName: matchedVendor?.storeName || u.restaurant_name || undefined,
          cuisine: u.cuisine || matchedVendor?.description || undefined,
          commissionRate: Number(u.commission_rate || matchedVendor?.commissionRate || 15),
          paymentModel:
            u.payment_model === 'markup' || matchedVendor?.commissionType === 'MARKUP'
              ? 'markup'
              : 'commission',
          vendorType: isXP ? 'XP Store' : 'Restaurant Vendor',
          totalSpent: Number(u.total_spent || 0),
          totalOrders: Number(u.total_orders || 0),
          bannerUrl: matchedVendor?.bannerUrl || undefined,
          latitude: u.latitude
            ? Number(u.latitude)
            : matchedVendor?.latitude
              ? Number(matchedVendor.latitude)
              : undefined,
          longitude: u.longitude
            ? Number(u.longitude)
            : matchedVendor?.longitude
              ? Number(matchedVendor.longitude)
              : undefined,
        })
      })

      setAccounts(combinedAccounts)
    } catch (err) {
      console.error('Failed to load DB records:', err)
    } finally {
      setLoading(false)
    }
  }

  useAdminStatsUpdates(() => {
    fetchAccountsAndVendors()
    void showBrowserNotification({
      title: 'Platform Activity Update ⚡',
      body: 'New live activity detected across orders or settlements.',
      tag: 'admin-stats-update',
      sound: true,
    })
  })

  useEffect(() => {
    fetchAccountsAndVendors()
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: deleteConfirmTarget.id,
          email: deleteConfirmTarget.email,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete vendor')
      }
      toast(`Store '${deleteConfirmTarget.name}' has been deleted!`, 'success')
      setDeleteConfirmTarget(null)
      fetchAccountsAndVendors()
    } catch (err: any) {
      toast(err.message || 'Could not delete store.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleAccountStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: nextStatus as any } : acc))
    )
    toast(`Account status updated to ${nextStatus.toUpperCase()}`, 'success')
  }

  // Filtered queries
  const q = searchQuery.toLowerCase()
  const vendorAccounts = accounts.filter(
    (a) =>
      (a.role === 'vendor' || a.role === 'restaurant_vendor') &&
      (a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.restaurantName && a.restaurantName.toLowerCase().includes(q)))
  )
  const customerAccounts = accounts.filter(
    (a) =>
      (a.role === 'customer' || a.role === 'user') &&
      (a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  )
  const driverAccounts = accounts.filter(
    (a) =>
      (a.role === 'driver' || a.role === 'rider') &&
      (a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  )
  const adminAccounts = accounts.filter(
    (a) =>
      a.role === 'admin' && (a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
  )

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Sub-Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-[#25332a] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18201c] dark:text-white tracking-tight">
            Platform Accounts &amp; Stores
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-[#9eb3a4] mt-1 font-medium">
            Restaurant vendor onboarding, pricing controls, customer insights &amp; live database
            sync.
          </p>
        </div>

        <button
          onClick={fetchAccountsAndVendors}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#202923] transition shadow-xs cursor-pointer"
        >
          <RefreshCw className="size-3.5 text-[#86a018]" /> Refresh Database Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#1c2620] p-3 sm:p-3.5 rounded-2xl border border-gray-200 dark:border-[#2d3b32] shadow-sm dark:shadow-xl text-[#18201c] dark:text-white">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('vendors')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'users' && userTab === 'vendors'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-[#9eb3a4] dark:hover:bg-[#25332a] dark:border-[#25332a]'
            }`}
          >
            <Store className="size-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Vendors ({vendorAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('customers')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'users' && userTab === 'customers'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-[#9eb3a4] dark:hover:bg-[#25332a] dark:border-[#25332a]'
            }`}
          >
            <Users className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Customers ({customerAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('drivers')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'users' && userTab === 'drivers'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-[#9eb3a4] dark:hover:bg-[#25332a] dark:border-[#25332a]'
            }`}
          >
            <Zap className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Drivers ({driverAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('admins')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'users' && userTab === 'admins'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-[#9eb3a4] dark:hover:bg-[#25332a] dark:border-[#25332a]'
            }`}
          >
            <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Admins ({adminAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menu-pricing')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'menu-pricing'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-[#9eb3a4] dark:hover:bg-[#25332a] dark:border-[#25332a]'
            }`}
          >
            <Utensils className="size-4 text-amber-500 dark:text-[#d9f447] shrink-0" />
            <span>Menu &amp; Price Controls</span>
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400 dark:text-[#9eb3a4]" />
          <input
            type="text"
            placeholder="Search store, owner or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-[#25332a] bg-gray-50 dark:bg-[#121815] py-1.5 pl-8 pr-3 text-xs font-medium text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-[#9eb3a4] outline-none focus:border-emerald-500 dark:focus:border-[#d9f447]"
          />
        </div>
      </div>

      {/* Main View Content */}
      {activeTab === 'users' && (
        <UserAccountsView
          userTab={userTab}
          vendorAccounts={vendorAccounts}
          customerAccounts={customerAccounts}
          driverAccounts={driverAccounts}
          adminAccounts={adminAccounts}
          vendorsList={vendorsList}
          onOpenAddVendor={() => setIsAddVendorOpen(true)}
          onOpenAddDriver={() => setIsAddDriverOpen(true)}
          onEditAccount={(acc) => setEditingAccount(acc)}
          onToggleStatus={toggleAccountStatus}
          onDeleteAccount={(target) => setDeleteConfirmTarget(target)}
        />
      )}

      {activeTab === 'menu-pricing' && (
        <MenuPricingView
          vendorsList={vendorsList}
          onOpenMenuDrawer={(vendor) => {
            setSelectedVendorForMenu(vendor)
            setIsMenuDrawerOpen(true)
          }}
          onDeleteVendor={(target) => setDeleteConfirmTarget(target)}
        />
      )}

      {/* Modals */}
      <AddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onSuccess={fetchAccountsAndVendors}
      />

      <AddDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onSuccess={fetchAccountsAndVendors}
      />

      <EditAccountModal
        isOpen={!!editingAccount}
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSuccess={fetchAccountsAndVendors}
      />

      <MenuPricingDrawer
        isOpen={isMenuDrawerOpen}
        vendor={selectedVendorForMenu}
        onClose={() => {
          setIsMenuDrawerOpen(false)
          setSelectedVendorForMenu(null)
        }}
      />

      <DeleteConfirmModal
        target={deleteConfirmTarget}
        isDeleting={isDeleting}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
