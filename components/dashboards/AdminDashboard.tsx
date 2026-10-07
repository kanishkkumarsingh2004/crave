'use client'

import AdminAnalyticsPage from '@/app/admin/analytics/page'
import AdminSettingsPage from '@/app/admin/settings/page'
import { useAuth, UserRole } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import {
  CheckCircle2,
  Crown,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Users,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { useAdminStatsUpdates } from '@/lib/websocket'
import { FormEvent, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false })

interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  joinedDate: string
  detail: string
  phone?: string
  address?: string
  restaurantName?: string
  cuisine?: string
  commissionRate?: number
  paymentModel?: 'commission' | 'markup'
  vendorType?: 'Restaurant Vendor' | 'XP Store'
  totalSpent?: number
  totalOrders?: number
  latitude?: number
  longitude?: number
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

interface ProductItem {
  id: string
  vendorId: string
  categoryId?: string
  name: string
  description?: string
  sku?: string
  price: number
  comparePrice?: number
  currency: string
  imageUrl?: string
  status: 'ACTIVE' | 'OUT_OF_STOCK'
  categoryName?: string
}

interface VendorStore {
  id: string
  userId: string
  storeName: string
  description?: string
  address?: string
  status: string
  isOpen: boolean
  commissionRate?: number
  commissionType?: string
  bannerUrl?: string
  latitude?: number
  longitude?: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [activeTab, setActiveTabState] = useState<
    'overview' | 'analytics' | 'users' | 'menu-pricing' | 'payments' | 'system' | 'settings'
  >('users')

  // Sub-tabs in User Management
  const [userTab, setUserTabState] = useState<'vendors' | 'customers' | 'drivers' | 'admins'>(
    'vendors'
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem('crave_admin_active_tab')
      if (savedActive) {
        setActiveTabState(savedActive as any)
      }
      const savedUserTab = localStorage.getItem('crave_admin_user_tab')
      if (savedUserTab) {
        setUserTabState(savedUserTab as any)
      }
    }
  }, [])

  const setActiveTab = (
    tab: 'overview' | 'analytics' | 'users' | 'menu-pricing' | 'payments' | 'system' | 'settings'
  ) => {
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
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  // Data States
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [vendorsList, setVendorsList] = useState<VendorStore[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentReference[]>([])

  // Vendor Onboarding Modal State
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false)
  const [vendorSubmitting, setVendorSubmitting] = useState(false)
  const [newVendorForm, setNewVendorForm] = useState({
    ownerName: '',
    email: '',
    password: '',
    storeName: '',
    vendorType: 'Restaurant Vendor' as 'Restaurant Vendor' | 'XP Store',
    cuisine: '',
    phone: '',
    address: '',
    commissionRate: 15,
    paymentModel: 'commission' as 'commission' | 'markup',
    bannerUrl: '',
    latitude: 12.679898,
    longitude: 77.469493,
  })

  // Driver Onboarding Modal State
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
  const [driverSubmitting, setDriverSubmitting] = useState(false)
  const [newDriverForm, setNewDriverForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicleType: 'Electric Scooter',
    licensePlate: '',
    address: '',
  })

  // Edit Account Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    storeName: '',
    cuisine: '',
    commissionRate: 15,
    paymentModel: 'commission' as 'commission' | 'markup',
    vehicleType: 'Electric Scooter',
    licensePlate: '',
    latitude: 12.679898,
    longitude: 77.469493,
  })

  // Admin Menu & Price Alteration Drawer / Modal State
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false)
  const [selectedVendorForMenu, setSelectedVendorForMenu] = useState<VendorStore | null>(null)
  const [vendorProducts, setVendorProducts] = useState<ProductItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  // Edit Product Modal inside Menu Drawer
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    categoryName: 'General',
    price: '' as number | '',
    comparePrice: '' as number | '',
    imageUrl: '',
    sku: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  })

  // Delete Store Confirmation State
  const [deleteConfirmVendor, setDeleteConfirmVendor] = useState<{
    id: string
    name: string
    email?: string
  } | null>(null)
  const [isDeletingVendor, setIsDeletingVendor] = useState<boolean>(false)

  function triggerToast(msg: string) {
    const clean = msg.replace(/^[^\w\s₹🗑️]+\s*/, '')
    const isError = /could not|failed|error|unable|invalid/i.test(clean)
    toast(clean, isError ? 'error' : 'success')
  }

  // Fetch real database records
  const fetchAccountsAndVendors = async () => {
    try {
      setAccountsLoading(true)

      // 1. Fetch restaurants (vendors) from API
      const resRest = await fetch('/api/restaurants', { cache: 'no-store' })
      const restaurantsJson = await resRest.json()
      const vendorsData = restaurantsJson.restaurants || []

      // 2. Fetch users from API
      const resUsers = await fetch('/api/admin/users', { cache: 'no-store' })
      const usersJson = await resUsers.json()
      const usersData = usersJson.users || []

      const realVendorsList: VendorStore[] = vendorsData
        ? (vendorsData as any[]).map((r: any) => ({
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
          }))
        : []

      setVendorsList(realVendorsList)

      const combinedAccounts: AccountRecord[] = []

      if (usersData && usersData.length > 0) {
        usersData.forEach((u: any) => {
          const matchedVendor = realVendorsList.find((v) => v.userId === u.id || v.id === u.id)
          const isXP =
            matchedVendor?.description?.toLowerCase().includes('xp') ||
            u.cuisine?.toLowerCase().includes('xp')

          const normalizedRole: UserRole =
            u.role === 'user' || u.role === 'customer'
              ? 'customer'
              : u.role === 'rider' || u.role === 'driver'
                ? 'driver'
                : u.role === 'restaurant_vendor' ||
                    u.role === 'cravexp_store_vendor' ||
                    u.role === 'vendor'
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
                    : u.role === 'cravexp_store_vendor'
                      ? 'CraveXP Store Vendor'
                      : u.address || 'Registered Customer',
            phone: u.phone || undefined,
            address: u.address || undefined,
            restaurantName: matchedVendor?.storeName || u.restaurant_name || undefined,
            cuisine: u.cuisine || undefined,
            commissionRate: Number(u.commission_rate || matchedVendor?.commissionRate || 15),
            paymentModel:
              u.payment_model === 'markup' || matchedVendor?.commissionType === 'MARKUP'
                ? 'markup'
                : 'commission',
            vendorType: isXP ? 'XP Store' : 'Restaurant Vendor',
            totalSpent: Number(u.total_spent || 0),
            totalOrders: Number(u.total_orders || 0),
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
      }

      if (realVendorsList.length > 0) {
        realVendorsList.forEach((v) => {
          const exists = combinedAccounts.some((a) => a.id === v.id || a.id === v.userId)
          if (!exists) {
            const isXP =
              v.description?.toLowerCase().includes('xp') ||
              v.storeName?.toLowerCase().includes('xp')
            combinedAccounts.push({
              id: v.id,
              name: v.storeName || 'Store Vendor',
              email: `${v.storeName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'store'}@crave.com`,
              role: v.commissionType === 'MARKUP' ? 'vendor' : 'restaurant_vendor',
              status: v.status ? (v.status.toLowerCase() as any) : 'active',
              joinedDate: 'Active',
              detail: v.storeName,
              phone: undefined,
              address: v.address || 'Bengaluru, India',
              restaurantName: v.storeName,
              cuisine: v.description
                ? v.description.split('·')[1]?.trim() || v.description
                : 'Multi-Cuisine',
              commissionRate: v.commissionRate || 15,
              paymentModel: v.commissionType === 'MARKUP' ? 'markup' : 'commission',
              vendorType: isXP ? 'XP Store' : 'Restaurant Vendor',
              totalSpent: 0,
              totalOrders: 0,
              latitude: v.latitude ? Number(v.latitude) : undefined,
              longitude: v.longitude ? Number(v.longitude) : undefined,
            })
          }
        })
      }

      setAccounts(combinedAccounts)
    } catch (err) {
      console.error('Failed to scrub DB records:', err)
    } finally {
      setAccountsLoading(false)
    }
  }

  // Fetch Payment Queue
  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payment-reviews', { cache: 'no-store' })
      const json = await res.json()
      const data = json.reviews || []

      if (data) {
        setPayments(
          data.map((p: any) => ({
            id: p.id,
            orderId: p.order_id,
            customerUpi: p.customer_vpa,
            utrRef: p.utr_ref,
            amount: p.amount,
            submittedAt: p.created_at
              ? new Date(p.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now',
            status: (p.status as 'pending' | 'verified' | 'rejected') || 'pending',
          }))
        )
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    }
  }

  useAdminStatsUpdates(() => {
    fetchAccountsAndVendors()
    fetchPayments()
  })

  useEffect(() => {
    fetchAccountsAndVendors()
    fetchPayments()
  }, [])

  // Admin Vendor Onboarding Handler
  async function handleOnboardVendor(e: FormEvent) {
    e.preventDefault()
    if (
      !newVendorForm.ownerName ||
      !newVendorForm.email ||
      !newVendorForm.password ||
      !newVendorForm.storeName
    ) {
      triggerToast('Please fill in all required vendor onboarding fields.')
      return
    }

    setVendorSubmitting(true)

    try {
      const res = await fetch('/api/admin/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVendorForm.ownerName,
          email: newVendorForm.email,
          password: newVendorForm.password,
          storeName: newVendorForm.storeName,
          vendorType: newVendorForm.vendorType,
          cuisine: newVendorForm.cuisine,
          phone: newVendorForm.phone,
          address: newVendorForm.address,
          commissionRate: newVendorForm.commissionRate,
          paymentModel: newVendorForm.paymentModel,
          bannerUrl: newVendorForm.bannerUrl,
          latitude: newVendorForm.latitude,
          longitude: newVendorForm.longitude,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Vendor creation failed')
      }

      triggerToast(
        `🎉 ${newVendorForm.storeName} successfully onboarded as ${newVendorForm.vendorType}!`
      )
      setIsAddVendorOpen(false)

      setNewVendorForm({
        ownerName: '',
        email: '',
        password: '',
        storeName: '',
        vendorType: 'Restaurant Vendor',
        cuisine: '',
        phone: '',
        address: '',
        commissionRate: 15,
        paymentModel: 'commission',
        bannerUrl: '',
        latitude: 12.679898,
        longitude: 77.469493,
      })

      fetchAccountsAndVendors()
    } catch (err: any) {
      console.error('Vendor onboarding error:', err)
      triggerToast(err.message || 'Could not onboard vendor. Try again.')
    } finally {
      setVendorSubmitting(false)
    }
  }

  // Admin Driver Onboarding Handler
  async function handleOnboardDriver(e: FormEvent) {
    e.preventDefault()
    if (!newDriverForm.name || !newDriverForm.email || !newDriverForm.password) {
      triggerToast('Please fill in all required driver onboarding fields.')
      return
    }

    setDriverSubmitting(true)

    try {
      const res = await fetch('/api/admin/create-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverForm.name,
          email: newDriverForm.email,
          password: newDriverForm.password,
          phone: newDriverForm.phone,
          vehicle_type: newDriverForm.vehicleType,
          license_plate: newDriverForm.licensePlate,
          address: newDriverForm.address,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Driver creation failed')
      }

      triggerToast(`⚡ Driver '${newDriverForm.name}' successfully onboarded!`)
      setIsAddDriverOpen(false)

      setNewDriverForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicleType: 'Electric Scooter',
        licensePlate: '',
        address: '',
      })

      fetchAccountsAndVendors()
    } catch (err: any) {
      console.error('Driver onboarding error:', err)
      triggerToast(err.message || 'Could not onboard driver. Try again.')
    } finally {
      setDriverSubmitting(false)
    }
  }

  // Open Edit Modal for Account (Vendor, Customer, Driver, Admin)
  function openEditModal(acc: AccountRecord) {
    setEditingAccount(acc)
    setEditForm({
      name: acc.name || '',
      email: acc.email || '',
      phone: acc.phone || '',
      address: acc.address || '',
      password: '',
      storeName: acc.restaurantName || acc.detail || '',
      cuisine: acc.cuisine || '',
      commissionRate: acc.commissionRate ?? 15,
      paymentModel: acc.paymentModel || 'commission',
      vehicleType:
        acc.role === 'driver' || acc.role === 'rider'
          ? acc.detail?.split('·')[0]?.trim() || 'Electric Scooter'
          : 'Electric Scooter',
      licensePlate:
        acc.role === 'driver' || acc.role === 'rider'
          ? acc.detail?.split('·')[1]?.trim() || ''
          : '',
      latitude: acc.latitude ?? 12.679898,
      longitude: acc.longitude ?? 77.469493,
    })
    setIsEditModalOpen(true)
  }

  // Submit Save Edit Handler
  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingAccount) return

    setEditSubmitting(true)
    try {
      const res = await fetch('/api/admin/edit-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          ...(editForm.password && { password: editForm.password }),
          ...(editingAccount.role === 'vendor' ||
          editingAccount.role === 'restaurant_vendor' ||
          editingAccount.role === 'cravexp_store_vendor'
            ? {
                storeName: editForm.storeName,
                cuisine: editForm.cuisine,
                commissionRate: editForm.commissionRate,
                paymentModel: editForm.paymentModel,
                latitude: editForm.latitude,
                longitude: editForm.longitude,
              }
            : {}),
          ...(editingAccount.role === 'driver' || editingAccount.role === 'rider'
            ? {
                vehicleType: editForm.vehicleType,
                licensePlate: editForm.licensePlate,
              }
            : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update account')
      }

      triggerToast(`✏️ Account for '${editForm.name || editingAccount.name}' successfully updated!`)
      setIsEditModalOpen(false)
      setEditingAccount(null)
      fetchAccountsAndVendors()
    } catch (err: any) {
      console.error('Account edit error:', err)
      triggerToast(err.message || 'Could not update account.')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Admin Delete Vendor Handler
  async function handleDeleteVendor(vendorId: string, email?: string, name?: string) {
    setIsDeletingVendor(true)
    try {
      const res = await fetch('/api/admin/delete-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, email }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete vendor')
      }
      triggerToast(`🗑️ Store '${name || 'Vendor'}' has been permanently deleted!`)
      setDeleteConfirmVendor(null)
      fetchAccountsAndVendors()
    } catch (err: any) {
      console.error('Delete vendor error:', err)
      triggerToast(err.message || 'Could not delete store.')
    } finally {
      setIsDeletingVendor(false)
    }
  }

  // Fetch Vendor Products for Menu & Pricing Drawer
  async function openMenuDrawerForVendor(vendor: VendorStore) {
    setSelectedVendorForMenu(vendor)
    setIsMenuDrawerOpen(true)
    setProductsLoading(true)

    try {
      const res = await fetch(`/api/menu-items?restaurantId=${vendor.id}`, { cache: 'no-store' })
      const json = await res.json()
      const data = json.items || []

      if (data) {
        setVendorProducts(
          data.map((p: any) => ({
            id: p.id,
            vendorId: p.restaurant_id,
            categoryId: p.category,
            name: p.name,
            description: p.description,
            sku: p.sku_code,
            price: Number(p.price),
            comparePrice: p.mrp ? Number(p.mrp) : undefined,
            currency: 'INR',
            imageUrl: p.image,
            status: p.in_stock ? 'ACTIVE' : 'INACTIVE',
            categoryName: p.category || 'General',
          }))
        )
      } else {
        setVendorProducts([])
      }
    } catch (err) {
      console.error('Failed to load vendor products:', err)
      setVendorProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  // Save Product Changes / Add New Product
  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault()
    if (!selectedVendorForMenu || !productForm.name || productForm.price === '') return

    const isEdit = !!editingProduct
    const prodId = editingProduct ? editingProduct.id : crypto.randomUUID()
    const finalPrice = Number(productForm.price)
    const finalComparePrice =
      productForm.comparePrice !== '' ? Number(productForm.comparePrice) : null

    try {
      if (isEdit) {
        const res = await fetch('/api/menu-items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prodId,
            name: productForm.name,
            description: `${productForm.categoryName} · ${productForm.description || ''}`,
            price: finalPrice,
            mrp: finalComparePrice,
            image: productForm.imageUrl || null,
            in_stock: productForm.status === 'ACTIVE',
            sku_code: productForm.sku || `SKU-${Date.now()}`,
          }),
        })
        if (!res.ok) throw new Error('Update failed')
        triggerToast(`Updated product '${productForm.name}' pricing & details!`)
      } else {
        const res = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: prodId,
            restaurant_id: selectedVendorForMenu.id,
            name: productForm.name,
            category: productForm.categoryName || 'General',
            price: finalPrice,
            description: `${productForm.categoryName} · ${productForm.description || ''}`,
            image:
              productForm.imageUrl ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            in_stock: productForm.status === 'ACTIVE',
            is_veg: productForm.categoryName?.toLowerCase().includes('veg') ?? false,
            mrp: finalComparePrice,
            sku_code: productForm.sku || `SKU-${Date.now()}`,
          }),
        })
        if (!res.ok) throw new Error('Create failed')
        triggerToast(`Added '${productForm.name}' to ${selectedVendorForMenu.storeName}'s catalog!`)
      }

      setIsAddProductOpen(false)
      setEditingProduct(null)
      openMenuDrawerForVendor(selectedVendorForMenu)
    } catch (err: any) {
      console.error('Failed to save product:', err)
      triggerToast('Error saving product: ' + err.message)
    }
  }

  // Quick Discount Application Preset (e.g., 20% OFF)
  function applyQuickDiscount(percent: number) {
    if (productForm.price === '' && productForm.comparePrice === '') return

    const baseMRP =
      productForm.comparePrice !== ''
        ? Number(productForm.comparePrice)
        : Number(productForm.price || 0)

    if (baseMRP <= 0) return

    const discountedPrice = Math.round(baseMRP * (1 - percent / 100))
    setProductForm({
      ...productForm,
      comparePrice: baseMRP,
      price: discountedPrice,
    })
    triggerToast(`Applied ${percent}% OFF! Price set to ₹${discountedPrice} (Original ₹${baseMRP})`)
  }

  // Toggle Account Status
  function toggleAccountStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: nextStatus as any } : acc))
    )
    triggerToast(`Account status updated to ${nextStatus.toUpperCase()}`)
  }

  // Filtered lists for tabs
  const vendorAccounts = accounts.filter(
    (a) =>
      (a.role === 'vendor' ||
        a.role === 'restaurant_vendor' ||
        a.role === 'cravexp_store_vendor') &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.restaurantName && a.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  const customerAccounts = accounts.filter(
    (a) =>
      (a.role === 'customer' || a.role === 'user') &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const driverAccounts = accounts.filter(
    (a) =>
      (a.role === 'driver' || a.role === 'rider') &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const adminAccounts = accounts.filter(
    (a) =>
      a.role === 'admin' &&
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const topSpenders = [...customerAccounts]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Navigation Sub-Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#18201c]">Platform Accounts &amp; Stores</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Admin vendor onboarding (Restaurants &amp; XP Stores), pricing controls, customer
            insights &amp; live Supabase sync.
          </p>
        </div>

        <button
          onClick={fetchAccountsAndVendors}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
        >
          <RefreshCw className="size-3.5 text-[#86a018]" /> Refresh Supabase Data
        </button>
      </div>

      {/* Sub-Tabs: Vendors | Customers | Drivers | Admins | Menu & Price Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('vendors')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'users' && userTab === 'vendors'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Store className="size-4 text-amber-400" />
            <span>Vendors ({vendorAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('customers')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'users' && userTab === 'customers'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="size-4 text-emerald-400" />
            <span>Customers ({customerAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('drivers')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'users' && userTab === 'drivers'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap className="size-4 text-blue-400" />
            <span>Drivers ({driverAccounts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users')
              setUserTab('admins')
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'users' && userTab === 'admins'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="size-4 text-purple-400" />
            <span>Admins ({adminAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menu-pricing')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'menu-pricing'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Utensils className="size-4 text-[#d9f447]" />
            <span>Menu &amp; Price Controls</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search store, owner or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs font-medium outline-none focus:border-[#86a018] focus:bg-white"
          />
        </div>
      </div>

      {/* SUB-TAB 1: VENDORS TABLE */}
      {activeTab === 'users' && userTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#18201c]">Registered Store Vendors</h3>
              <p className="text-[11px] text-gray-500">
                Admin-only onboarding. Manage Restaurants &amp; XP Stores, alter pricing, or access
                menus.
              </p>
            </div>

            <button
              onClick={() => setIsAddVendorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-black transition"
            >
              <Plus className="size-3.5 text-[#d9f447]" /> + Onboard New Store
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-[25%]">Store &amp; Owner</th>
                  <th className="px-4 py-3.5 w-[18%]">Vendor Category</th>
                  <th className="px-4 py-3.5 w-[25%]">Contact &amp; Address</th>
                  <th className="px-4 py-3.5 w-[12%]">Pricing Model</th>
                  <th className="px-4 py-3.5 w-[10%]">Status</th>
                  <th className="px-4 py-3.5 w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {vendorAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-gray-500">
                      No vendor stores currently registered in Supabase database. Click &apos;+
                      Onboard New Store&apos; to add one.
                    </td>
                  </tr>
                ) : (
                  vendorAccounts.map((account) => {
                    const matchedVendor = vendorsList.find(
                      (v) => v.id === account.id || v.userId === account.id
                    )
                    const isXPStore =
                      account.vendorType === 'XP Store' ||
                      account.detail?.toLowerCase().includes('xp')

                    return (
                      <tr key={account.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-[#18201c]">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid size-9 place-items-center rounded-xl shrink-0 font-bold ${
                                isXPStore
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <Store className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[#18201c] truncate">
                                {account.restaurantName || account.detail}
                              </p>
                              <p className="text-[11px] font-normal text-gray-500 truncate">
                                {account.name} · <span className="font-mono">{account.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              isXPStore
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {isXPStore ? 'XP Store' : 'Restaurant Vendor'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-gray-600">
                          <p className="font-medium text-xs text-gray-800">
                            {account.phone || 'Phone N/A'}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate max-w-[240px]">
                            {account.address || 'Bengaluru, India'}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-gray-800">
                          {account.paymentModel === 'markup' ? (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                              Price Markup
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                              Commission ({account.commissionRate}%)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              account.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                            />
                            {account.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {matchedVendor && (
                              <button
                                onClick={() => openMenuDrawerForVendor(matchedVendor)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-black transition whitespace-nowrap"
                              >
                                <Utensils className="size-3.5 text-[#d9f447]" /> Manage Menu &amp;
                                Prices
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(account)}
                              className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1"
                              title="Edit Vendor Details"
                            >
                              <Edit3 className="size-3.5 text-blue-600" /> Edit
                            </button>
                            <button
                              onClick={() => toggleAccountStatus(account.id, account.status)}
                              className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition whitespace-nowrap ${
                                account.status === 'active'
                                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {account.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirmVendor({
                                  id: account.id,
                                  name: account.restaurantName || account.detail || account.name,
                                  email: account.email,
                                })
                              }
                              className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition whitespace-nowrap flex items-center gap-1"
                              title="Delete Store & Account"
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
      )}

      {/* SUB-TAB 2: CUSTOMERS */}
      {activeTab === 'users' && userTab === 'customers' && (
        <div className="space-y-6">
          {topSpenders.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-950 to-[#18201c] p-5 text-white shadow-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-[#d9f447] text-[#18201c]">
                    <Crown className="size-5" />
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-white">VIP Spending Customers</h4>
                    <p className="text-[11px] text-white/70">
                      Real customer accounts ordered by lifetime spend
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  Active Sync
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {topSpenders.slice(0, 3).map((cust, idx) => (
                  <div
                    key={cust.id}
                    className="rounded-xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#d9f447] px-2 py-0.5 text-[9px] font-black text-[#18201c]">
                        #{idx + 1} SPENDER
                      </span>
                      <span className="text-[11px] font-bold text-emerald-300">
                        {cust.totalOrders} Orders
                      </span>
                    </div>
                    <p className="mt-2 font-bold text-sm text-white truncate">{cust.name}</p>
                    <p className="text-[11px] text-white/70 truncate">{cust.email}</p>
                    <p className="mt-1.5 text-lg font-extrabold text-[#d9f447]">
                      ₹{cust.totalSpent?.toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Directory Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-[25%]">Customer Name</th>
                  <th className="px-4 py-3.5 w-[25%]">Email &amp; Contact</th>
                  <th className="px-4 py-3.5 w-[25%]">Delivery Address</th>
                  <th className="px-4 py-3.5 w-[15%]">Total Spend</th>
                  <th className="px-4 py-3.5 w-[10%]">Status</th>
                  <th className="px-4 py-3.5 w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {customerAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-gray-500">
                      No customer accounts currently stored in Supabase users table.
                    </td>
                  </tr>
                ) : (
                  customerAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-[#18201c]">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            <Users className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#18201c]">{account.name}</p>
                            <p className="text-[11px] font-normal text-gray-500">
                              Joined: {account.joinedDate}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-gray-600">
                        <p className="font-semibold">{account.email}</p>
                        <p className="text-[11px] text-gray-500">{account.phone || 'Phone N/A'}</p>
                      </td>

                      <td className="px-4 py-3.5 text-gray-600 truncate max-w-[200px]">
                        {account.address || 'Bengaluru, India'}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-[#18201c]">
                        ₹{account.totalSpent?.toLocaleString('en-IN')} ({account.totalOrders}{' '}
                        orders)
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            account.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(account)}
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1"
                            title="Edit Customer Details"
                          >
                            <Edit3 className="size-3.5 text-blue-600" /> Edit
                          </button>
                          <button
                            onClick={() => toggleAccountStatus(account.id, account.status)}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition ${
                              account.status === 'active'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
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
      )}

      {/* SUB-TAB 3: DRIVERS */}
      {activeTab === 'users' && userTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#18201c]">Registered Delivery Partners</h3>
              <p className="text-[11px] text-gray-500">
                Admin onboarding. View fleet accounts, vehicle details, license numbers, and active
                status.
              </p>
            </div>

            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-black transition cursor-pointer"
            >
              <Plus className="size-3.5 text-[#d9f447]" /> + Add Driver
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Driver Name</th>
                  <th className="px-4 py-3.5">Contact Email &amp; Phone</th>
                  <th className="px-4 py-3.5">Vehicle &amp; License Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {driverAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-gray-500">
                      No driver accounts found in Supabase users table. Click &apos;+ Add
                      Driver&apos; to onboard one.
                    </td>
                  </tr>
                ) : (
                  driverAccounts.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-[#18201c]">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-8 place-items-center rounded-lg bg-cyan-100 text-cyan-800 font-bold shrink-0">
                            <Zap className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#18201c]">{driver.name}</p>
                            <p className="text-[11px] text-gray-500 font-normal">
                              Joined: {driver.joinedDate}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        <p className="font-semibold">{driver.email}</p>
                        <p className="text-[11px] text-gray-500">{driver.phone || 'Phone N/A'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 font-semibold">
                        <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800 font-medium border border-gray-200">
                          {driver.detail}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            driver.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              driver.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {driver.status === 'active' ? 'Active Partner' : driver.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(driver)}
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1"
                            title="Edit Driver Details"
                          >
                            <Edit3 className="size-3.5 text-blue-600" /> Edit
                          </button>
                          <button
                            onClick={() => toggleAccountStatus(driver.id, driver.status)}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold border transition ${
                              driver.status === 'active'
                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {driver.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirmVendor({
                                id: driver.id,
                                name: driver.name,
                                email: driver.email,
                              })
                            }
                            className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1"
                            title="Delete Driver Account"
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
      )}

      {/* SUB-TAB 4: ADMINS */}
      {activeTab === 'users' && userTab === 'admins' && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Admin Name</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Role Privileges</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {adminAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-gray-500">
                    No admin records found in Supabase users table.
                  </td>
                </tr>
              ) : (
                adminAccounts.map((adm) => (
                  <tr key={adm.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#18201c]">{adm.name}</td>
                    <td className="px-4 py-3.5 text-gray-600">{adm.email}</td>
                    <td className="px-4 py-3.5 font-bold text-purple-800">Super Administrator</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-900">
                        Active Admin
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(adm)}
                        className="rounded-xl px-3 py-1.5 text-[11px] font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1"
                        title="Edit Admin Details"
                      >
                        <Edit3 className="size-3.5 text-blue-600" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2.5: ADMIN MENU & PRICING CONTROLS TAB */}
      {activeTab === 'menu-pricing' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                  Master Catalog &amp; Pricing Controls
                </span>
                <h3 className="text-lg font-bold text-[#18201c] mt-0.5">
                  Store Menu &amp; Price Alteration Controls
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Admin can access any store menu, alter regular item prices, and set percentage or
                  flat discounts.
                </p>
              </div>
            </div>

            {/* Vendor Selector Grid */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendorsList.map((vendor) => (
                <div
                  key={vendor.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#86a018] transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                        {vendor.description?.toLowerCase().includes('xp')
                          ? 'XP Store'
                          : 'Restaurant'}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {vendor.commissionRate}% Cut
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#18201c]">{vendor.storeName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {vendor.address || 'Bengaluru, India'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => openMenuDrawerForVendor(vendor)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#18201c] px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-black transition"
                    >
                      <Utensils className="size-4 text-[#d9f447]" /> Menu &amp; Prices
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirmVendor({ id: vendor.id, name: vendor.storeName })
                      }
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 transition shrink-0"
                      title="Delete Store"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              {vendorsList.length === 0 && (
                <div className="col-span-full p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                  No stores in Supabase database. Click &apos;+ Onboard Restaurant Vendor&apos; to
                  add a new Restaurant or XP Store.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT MODAL (ADMIN CONTROL) */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                  Account Management &amp; Editing
                </span>
                <h3 className="text-xl font-bold text-[#18201c] mt-0.5">
                  Edit{' '}
                  {editingAccount.role === 'vendor' ||
                  editingAccount.role === 'restaurant_vendor' ||
                  editingAccount.role === 'cravexp_store_vendor'
                    ? 'Store & Vendor'
                    : editingAccount.role === 'rider' || editingAccount.role === 'driver'
                      ? 'Driver Partner'
                      : editingAccount.role === 'admin'
                        ? 'Admin'
                        : 'Customer'}{' '}
                  Details
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingAccount(null)
                }}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Full Name / Owner Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Vendor Specific Fields */}
              {(editingAccount.role === 'vendor' ||
                editingAccount.role === 'restaurant_vendor' ||
                editingAccount.role === 'cravexp_store_vendor') && (
                <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-200 space-y-3">
                  <p className="font-bold text-[#18201c] flex items-center gap-1.5 text-xs">
                    <Store className="size-4 text-amber-700" /> Store &amp; Commission Parameters
                  </p>

                  <div>
                    <label className="font-bold text-gray-700">Store Name</label>
                    <input
                      type="text"
                      value={editForm.storeName}
                      onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="font-bold text-gray-700">Cuisine / Category</label>
                      <input
                        type="text"
                        value={editForm.cuisine}
                        onChange={(e) => setEditForm({ ...editForm, cuisine: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-medium outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-gray-700">Commission Rate (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={editForm.commissionRate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, commissionRate: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-bold outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Specific Fields */}
              {(editingAccount.role === 'rider' || editingAccount.role === 'driver') && (
                <div className="rounded-xl bg-cyan-50/70 p-4 border border-cyan-200 space-y-3">
                  <p className="font-bold text-[#18201c] flex items-center gap-1.5 text-xs">
                    <Zap className="size-4 text-cyan-700" /> Driver Vehicle &amp; Fleet Details
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="font-bold text-gray-700">Vehicle Type</label>
                      <select
                        value={editForm.vehicleType}
                        onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-bold outline-none focus:border-blue-500"
                      >
                        <option value="Electric Scooter">Electric Scooter (EV)</option>
                        <option value="Electric Bike">Electric Bike (EV)</option>
                        <option value="Motorcycle">Motorcycle / Petrol Bike</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Car">Delivery Car / Van</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700">License Plate Number</label>
                      <input
                        type="text"
                        placeholder="KA-05-EV-1234"
                        value={editForm.licensePlate}
                        onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-[#18201c]">Address / Location</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-blue-500"
                />
              </div>

              {/* Store Location Map Picker (For Vendor accounts) */}
              {(editingAccount.role === 'vendor' ||
                editingAccount.role === 'restaurant_vendor' ||
                editingAccount.role === 'cravexp_store_vendor') && (
                <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                      <span>Store Location Pin</span>
                    </h4>
                    <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {editForm.latitude.toFixed(4)}°, {editForm.longitude.toFixed(4)}°
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Click or drag the map pin to adjust the store's exact coordinates.
                  </p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <LocationPickerMap
                      initialLat={editForm.latitude}
                      initialLng={editForm.longitude}
                      onLocationSelect={(lat, lng, address) => {
                        setEditForm((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                          ...(address ? { address } : {}),
                        }))
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-[#18201c]">
                  Reset Account Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingAccount(null)
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white shadow-md hover:bg-blue-700 transition flex items-center gap-2"
                >
                  {editSubmitting ? (
                    <>
                      <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-white" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN DRIVER ONBOARDING MODAL */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                  Fleet &amp; Logistics Management
                </span>
                <h3 className="text-xl font-bold text-[#18201c] mt-0.5">Add New Delivery Driver</h3>
              </div>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardDriver} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newDriverForm.name}
                  onChange={(e) => setNewDriverForm({ ...newDriverForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              {/* Login Credentials Section */}
              <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200 space-y-3">
                <p className="font-bold text-[#18201c] flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="size-4 text-amber-700" /> Driver Account Login Credentials
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-bold text-gray-700">Driver Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="driver@crave.com"
                      value={newDriverForm.email}
                      onChange={(e) =>
                        setNewDriverForm({ ...newDriverForm, email: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-medium outline-none focus:border-[#86a018]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newDriverForm.password}
                      onChange={(e) =>
                        setNewDriverForm({ ...newDriverForm, password: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-medium outline-none focus:border-[#86a018]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newDriverForm.phone}
                    onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Vehicle Type</label>
                  <select
                    value={newDriverForm.vehicleType}
                    onChange={(e) =>
                      setNewDriverForm({ ...newDriverForm, vehicleType: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#86a018] bg-white"
                  >
                    <option value="Electric Scooter">Electric Scooter (EV)</option>
                    <option value="Electric Bike">Electric Bike (EV)</option>
                    <option value="Motorcycle">Motorcycle / Petrol Bike</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Delivery Car / Van</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Vehicle License Plate Number</label>
                  <input
                    type="text"
                    placeholder="KA-05-EV-1234"
                    value={newDriverForm.licensePlate}
                    onChange={(e) =>
                      setNewDriverForm({ ...newDriverForm, licensePlate: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-mono outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Operating Hub / Address</label>
                  <input
                    type="text"
                    placeholder="Indiranagar Hub, Bengaluru"
                    value={newDriverForm.address}
                    onChange={(e) =>
                      setNewDriverForm({ ...newDriverForm, address: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={driverSubmitting}
                  className="rounded-xl bg-[#18201c] px-6 py-2 font-bold text-white shadow-md hover:bg-black transition flex items-center gap-2"
                >
                  {driverSubmitting ? (
                    <>
                      <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Onboarding Driver...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-[#d9f447]" /> Onboard Driver
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR ONBOARDING MODAL (ADMIN ONLY) */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                  Admin Exclusive Flow
                </span>
                <h3 className="text-xl font-bold text-[#18201c] mt-0.5">
                  Onboard New Restaurant Vendor
                </h3>
                <p className="text-xs text-gray-500">
                  Register vendor credentials, store profile, cuisine, and commission model in
                  Supabase.
                </p>
              </div>
              <button
                onClick={() => setIsAddVendorOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardVendor} className="mt-5 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biryani Blues or craveXP Koramangala"
                    value={newVendorForm.storeName}
                    onChange={(e) =>
                      setNewVendorForm({ ...newVendorForm, storeName: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Vendor Category Type *</label>
                  <select
                    value={newVendorForm.vendorType}
                    onChange={(e) =>
                      setNewVendorForm({
                        ...newVendorForm,
                        vendorType: e.target.value as 'Restaurant Vendor',
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#86a018] bg-white"
                  >
                    <option value="Restaurant Vendor">Restaurant Vendor (Food &amp; Dining)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Owner / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={newVendorForm.ownerName}
                    onChange={(e) =>
                      setNewVendorForm({ ...newVendorForm, ownerName: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Cuisine / Store Specialties *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Indian, Biryani or Express Grocery"
                    value={newVendorForm.cuisine}
                    onChange={(e) =>
                      setNewVendorForm({ ...newVendorForm, cuisine: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200 space-y-3">
                <p className="font-bold text-[#18201c] flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="size-4 text-amber-700" /> Vendor Account Login Credentials
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-bold text-gray-700">Vendor Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="vendor@store.com"
                      value={newVendorForm.email}
                      onChange={(e) =>
                        setNewVendorForm({ ...newVendorForm, email: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-medium outline-none focus:border-[#86a018]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newVendorForm.password}
                      onChange={(e) =>
                        setNewVendorForm({ ...newVendorForm, password: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2.5 font-medium outline-none focus:border-[#86a018]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newVendorForm.phone}
                    onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Commission Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newVendorForm.commissionRate}
                    onChange={(e) =>
                      setNewVendorForm({ ...newVendorForm, commissionRate: Number(e.target.value) })
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-bold outline-none focus:border-[#86a018]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Store Address / Location</label>
                <input
                  type="text"
                  placeholder="104 Market St, Koramangala 4th Block, Bengaluru"
                  value={newVendorForm.address}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, address: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              {/* Store Location Map Picker */}
              <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#18201c] flex items-center gap-1.5">
                    <span>Store Location Pin</span>
                  </h4>
                  <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {newVendorForm.latitude.toFixed(4)}°, {newVendorForm.longitude.toFixed(4)}°
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Click or drag the map pin to mark the exact store coordinates for delivery
                  calculation.
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <LocationPickerMap
                    initialLat={newVendorForm.latitude}
                    initialLng={newVendorForm.longitude}
                    onLocationSelect={(lat, lng, address) => {
                      setNewVendorForm((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        ...(address ? { address } : {}),
                      }))
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vendorSubmitting}
                  className="rounded-xl bg-[#18201c] px-6 py-2 font-bold text-white shadow-md hover:bg-black transition flex items-center gap-2"
                >
                  {vendorSubmitting ? (
                    <>
                      <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Onboarding Vendor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-[#d9f447]" /> Onboard Vendor
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MENU & PRICE ALTERATION DRAWER / MODAL */}
      {isMenuDrawerOpen && selectedVendorForMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-900">
                      {selectedVendorForMenu.description?.toLowerCase().includes('xp')
                        ? 'XP Store'
                        : 'Restaurant'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {selectedVendorForMenu.commissionRate}% Commission Rate
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#18201c] mt-1">
                    {selectedVendorForMenu.storeName} — Menu &amp; Price Controls
                  </h3>
                  <p className="text-xs text-gray-500">
                    Admin can alter regular prices, set compare prices (discounts), or add new items
                    directly.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setProductForm({
                        name: '',
                        description: '',
                        categoryName: 'General',
                        price: '',
                        comparePrice: '',
                        imageUrl: '',
                        sku: '',
                        status: 'ACTIVE',
                      })
                      setIsAddProductOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-black"
                  >
                    <Plus className="size-3.5 text-[#d9f447]" /> + Add Item for Vendor
                  </button>
                  <button
                    onClick={() => setIsMenuDrawerOpen(false)}
                    className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="mt-5 space-y-4">
                {productsLoading ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    Loading store products from Supabase database...
                  </div>
                ) : vendorProducts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                    No products found for this vendor store. Click &apos;+ Add Item for Vendor&apos;
                    to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="border-b border-gray-200 bg-gray-50/90 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Product / Item</th>
                          <th className="px-4 py-3">Selling Price</th>
                          <th className="px-4 py-3">Original MRP</th>
                          <th className="px-4 py-3">Discount Badge</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {vendorProducts.map((product) => {
                          const hasDiscount =
                            product.comparePrice && product.comparePrice > product.price
                          const discountPct = hasDiscount
                            ? Math.round(
                                ((product.comparePrice! - product.price) / product.comparePrice!) *
                                  100
                              )
                            : 0

                          return (
                            <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#18201c]">
                                <div className="flex items-center gap-3">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="size-9 rounded-lg object-cover border border-gray-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="grid size-9 place-items-center rounded-lg bg-gray-100 text-gray-400 shrink-0">
                                      <Utensils className="size-4" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-sm text-[#18201c]">
                                      {product.name}
                                    </p>
                                    <p className="text-[11px] font-normal text-gray-500 line-clamp-1">
                                      {product.description || 'No description'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 font-bold text-sm text-[#18201c] whitespace-nowrap">
                                ₹{product.price}
                              </td>

                              <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                                {product.comparePrice ? (
                                  <span className="line-through">₹{product.comparePrice}</span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasDiscount ? (
                                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 border border-rose-200">
                                    {discountPct}% OFF
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400">Regular</span>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    product.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {product.status}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product)
                                    setProductForm({
                                      name: product.name,
                                      description: product.description?.includes('·')
                                        ? product.description.split('·')[1].trim()
                                        : product.description || '',
                                      categoryName: product.categoryName || 'General',
                                      price: product.price,
                                      comparePrice: product.comparePrice || '',
                                      imageUrl: product.imageUrl || '',
                                      sku: product.sku || '',
                                      status: product.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                                    })
                                    setIsAddProductOpen(true)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-800 hover:bg-gray-200 transition"
                                >
                                  <Edit3 className="size-3.5 text-amber-600" /> Alter Price / Edit
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsMenuDrawerOpen(false)}
                className="rounded-xl border border-gray-300 px-5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD PRODUCT MODAL FOR ADMIN */}
      {isAddProductOpen && selectedVendorForMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                  Admin Price &amp; Menu Modifier
                </span>
                <h3 className="text-xl font-bold text-[#18201c] mt-0.5">
                  {editingProduct
                    ? `Alter '${editingProduct.name}' Price`
                    : 'Add New Product to Store'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              {/* Price & Compare Price Alteration Box */}
              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 space-y-3">
                <p className="font-bold text-[#18201c] flex items-center gap-1.5 text-xs">
                  <Tag className="size-4 text-amber-600" /> Admin Pricing &amp; Discount Presets
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700">Selling Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2 font-extrabold text-sm outline-none focus:border-[#86a018]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Original MRP / Compare (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 200"
                      value={productForm.comparePrice}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          comparePrice: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-2 font-bold text-sm outline-none focus:border-[#86a018]"
                    />
                  </div>
                </div>

                {/* Quick Discount Tool */}
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">
                    Quick Discount Presets:
                  </p>
                  <div className="flex items-center gap-2">
                    {[10, 20, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyQuickDiscount(pct)}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-800 hover:bg-[#18201c] hover:text-white transition"
                      >
                        {pct}% OFF
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Description / Notes</label>
                <input
                  type="text"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Product Image URL</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 font-mono text-[11px] outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 border border-gray-200">
                <span className="font-bold text-[#18201c]">Product In-Stock Status</span>
                <select
                  value={productForm.status}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      status: e.target.value as 'ACTIVE' | 'INACTIVE',
                    })
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-bold outline-none text-xs"
                >
                  <option value="ACTIVE">Active (In Stock)</option>
                  <option value="INACTIVE">Out of Stock</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#18201c] px-6 py-2 font-bold text-white shadow-md hover:bg-black"
                >
                  Save Product &amp; Update Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STORE CONFIRMATION MODAL */}
      {deleteConfirmVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-[#18201c]">
              Delete Store / Restaurant?
            </h3>
            <p className="mt-2 text-center text-xs text-gray-600 leading-relaxed">
              Are you sure you want to permanently delete store{' '}
              <strong className="text-gray-900">{deleteConfirmVendor.name}</strong>
              {deleteConfirmVendor.email ? ` (${deleteConfirmVendor.email})` : ''}? This action will
              erase the store, owner account, and all associated menu items from Supabase.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmVendor(null)}
                disabled={isDeletingVendor}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDeleteVendor(
                    deleteConfirmVendor.id,
                    deleteConfirmVendor.email,
                    deleteConfirmVendor.name
                  )
                }
                disabled={isDeletingVendor}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition flex items-center justify-center gap-2"
              >
                {isDeletingVendor ? 'Deleting...' : 'Yes, Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
