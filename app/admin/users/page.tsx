'use client'

import { UserRole } from '@/lib/auth-context'
import {
  CheckCircle2,
  ChefHat,
  DollarSign,
  Edit3,
  Plus,
  Search,
  Sliders,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import React, { useState } from 'react'

export interface MenuItem {
  id: string
  name: string
  category: string
  isVeg: boolean
  basePrice: number // Agreed price paid to restaurant
  markupPrice: number // Price displayed to customer on app
  inStock: boolean
  description: string
}

export interface VendorDetails {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  cuisine: string
  address: string
  fssaiLicense: string
  bankAccount: string
  ifscCode: string
  paymentModel: 'commission' | 'markup' // Commission Mode (e.g. 15%) vs Price Markup Mode
  commissionRate: number // % cut taken in commission mode
  kitchenStatus: 'open' | 'closed'
  menu: MenuItem[]
}

interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  joinedDate: string
  detail: string
  vendorData?: VendorDetails
}

export default function AdminUsersPage() {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // State for active Vendor Overview modal/drawer
  const [activeVendorModal, setActiveVendorModal] = useState<VendorDetails | null>(null)

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState<{
    name: string
    email: string
    role: UserRole
    phone: string
    detail: string
    status: 'active' | 'pending'
  }>({
    name: '',
    email: '',
    role: 'customer',
    phone: '',
    detail: '',
    status: 'active',
  })

  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserForm.name || !newUserForm.email) return

    const newAcc: AccountRecord = {
      id: 'u_' + Date.now(),
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      status: newUserForm.status,
      joinedDate: new Date().toISOString().split('T')[0],
      detail: newUserForm.detail || `${newUserForm.role.toUpperCase()} Account`,
    }

    if (newUserForm.role === 'vendor') {
      newAcc.vendorData = {
        id: newAcc.id,
        name: newUserForm.name,
        ownerName: newUserForm.name,
        email: newUserForm.email,
        phone: newUserForm.phone || '+91 99000 00000',
        cuisine: newUserForm.detail || 'Multi-Cuisine Kitchen',
        address: 'Bengaluru, India',
        fssaiLicense: '#FSSAI-' + Math.floor(10000000 + Math.random() * 90000000),
        bankAccount: 'HDFC Bank ••• 9821',
        ifscCode: 'HDFC0001234',
        paymentModel: 'commission',
        commissionRate: 15,
        kitchenStatus: 'open',
        menu: [],
      }
    }

    setAccounts((prev) => [newAcc, ...prev])
    setIsAddUserOpen(false)
    setNewUserForm({
      name: '',
      email: '',
      role: 'customer',
      phone: '',
      detail: '',
      status: 'active',
    })
  }

  // State for editing menu or adding new item
  const [isAddingDish, setIsAddingDish] = useState(false)
  const [newDish, setNewDish] = useState<{
    name: string
    category: string
    isVeg: boolean
    basePrice: string
    markupPrice: string
    description: string
  }>({
    name: '',
    category: 'Mains',
    isVeg: true,
    basePrice: '',
    markupPrice: '',
    description: '',
  })

  const [editingDishId, setEditingDishId] = useState<string | null>(null)
  const [editDishData, setEditDishData] = useState<{
    name: string
    category: string
    isVeg: boolean
    basePrice: number
    markupPrice: number
    description: string
  }>({
    name: '',
    category: '',
    isVeg: true,
    basePrice: 0,
    markupPrice: 0,
    description: '',
  })

  const [accounts, setAccounts] = useState<AccountRecord[]>([
    {
      id: 'u1',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'customer',
      status: 'active',
      joinedDate: '2026-09-12',
      detail: '14 drops completed',
    },
    {
      id: 'v_1',
      name: 'The Green Table',
      email: 'green@table.com',
      role: 'vendor',
      status: 'active',
      joinedDate: '2026-08-01',
      detail: 'FSSAI Verified #1122',
      vendorData: {
        id: 'v_1',
        name: 'The Green Table',
        ownerName: 'Maya Lin',
        email: 'green@table.com',
        phone: '+91 98111 22334',
        cuisine: 'Healthy Bowls & Salads',
        address: '100ft Rd, Indiranagar, Bengaluru',
        fssaiLicense: '#11223344556677',
        bankAccount: 'HDFC Bank •••• 9821',
        ifscCode: 'HDFC0001234',
        paymentModel: 'commission',
        commissionRate: 15,
        kitchenStatus: 'open',
        menu: [
          {
            id: 'm1',
            name: 'Avocado Quinoa Harvest Bowl',
            category: 'Bowls',
            isVeg: true,
            basePrice: 240,
            markupPrice: 240,
            inStock: true,
            description: 'Organic avocado, roasted chickpea, baby spinach, tahini dressing.',
          },
          {
            id: 'm2',
            name: 'Tofu & Kale Caesar Wrap',
            category: 'Wraps',
            isVeg: true,
            basePrice: 190,
            markupPrice: 190,
            inStock: true,
            description: 'Grilled protein tofu, garlic kale chips, wholewheat tortilla.',
          },
          {
            id: 'm3',
            name: 'Green Goddess Detox Smoothie',
            category: 'Beverages',
            isVeg: true,
            basePrice: 140,
            markupPrice: 140,
            inStock: true,
            description: 'Celery, green apple, cucumber, chia seeds.',
          },
        ],
      },
    },
    {
      id: 'v_2',
      name: 'Momo House & Asian Grill',
      email: 'momo@house.com',
      role: 'vendor',
      status: 'active',
      joinedDate: '2026-08-05',
      detail: 'Markup Partner Model',
      vendorData: {
        id: 'v_2',
        name: 'Momo House & Asian Grill',
        ownerName: 'Tenzin Norbu',
        email: 'momo@house.com',
        phone: '+91 98450 11223',
        cuisine: 'Asian · Dumplings · Noodles',
        address: '5th Block, Koramangala, Bengaluru',
        fssaiLicense: '#22334455667788',
        bankAccount: 'ICICI Bank •••• 4412',
        ifscCode: 'ICIC0000982',
        paymentModel: 'markup',
        commissionRate: 15,
        kitchenStatus: 'open',
        menu: [
          {
            id: 'm4',
            name: 'Steamed Chicken Darjeeling Momos (8pcs)',
            category: 'Starters',
            isVeg: false,
            basePrice: 130, // Vendor gets ₹130
            markupPrice: 180, // Platform sells for ₹180 (Profit ₹50/order)
            inStock: true,
            description: 'Handcrafted momos served with spicy red chili chutney.',
          },
          {
            id: 'm5',
            name: 'Wok Tossed Chili Garlic Noodles',
            category: 'Mains',
            isVeg: true,
            basePrice: 160, // Vendor gets ₹160
            markupPrice: 220, // Platform sells for ₹220 (Profit ₹60/order)
            inStock: true,
            description: 'Hand-pulled noodles tossed with scallions and garlic Szechuan paste.',
          },
          {
            id: 'm6',
            name: 'Crispy Veg Spring Rolls',
            category: 'Starters',
            isVeg: true,
            basePrice: 110, // Vendor gets ₹110
            markupPrice: 160, // Platform sells for ₹160 (Profit ₹50/order)
            inStock: false,
            description: 'Glass noodles, wood ear mushrooms, sweet plum dip.',
          },
        ],
      },
    },
    {
      id: 'u3',
      name: 'Rajesh Kumar',
      email: 'rajesh@express.com',
      role: 'driver',
      status: 'active',
      joinedDate: '2026-08-15',
      detail: 'Ather 450X EV Bike',
    },
    {
      id: 'u4',
      name: 'Sara Vance',
      email: 'admin@crave.com',
      role: 'admin',
      status: 'active',
      joinedDate: '2026-01-01',
      detail: 'Master System Admin',
    },
    {
      id: 'v_3',
      name: 'Spice Route Bistro',
      email: 'spice@route.com',
      role: 'vendor',
      status: 'pending',
      joinedDate: '2026-10-02',
      detail: 'Awaiting License Review',
      vendorData: {
        id: 'v_3',
        name: 'Spice Route Bistro',
        ownerName: 'Rohan Deshmukh',
        email: 'spice@route.com',
        phone: '+91 98777 66554',
        cuisine: 'North Indian · Biryani',
        address: 'HSR Layout Sector 1, Bengaluru',
        fssaiLicense: '#44556677889900',
        bankAccount: 'SBI •••• 5590',
        ifscCode: 'SBIN0004821',
        paymentModel: 'commission',
        commissionRate: 18,
        kitchenStatus: 'closed',
        menu: [
          {
            id: 'm7',
            name: 'Butter Chicken Kathi Roll',
            category: 'Wraps',
            isVeg: false,
            basePrice: 190,
            markupPrice: 190,
            inStock: true,
            description: 'Tandoori chicken tikka rolled in flaky rumali bread.',
          },
        ],
      },
    },
    {
      id: 'u6',
      name: 'Vikram Singh',
      email: 'vikram@delivery.com',
      role: 'driver',
      status: 'pending',
      joinedDate: '2026-10-02',
      detail: 'Awaiting Driving License Verification',
    },
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

  // Update payment mode for vendor
  function updateVendorPaymentModel(
    vendorId: string,
    model: 'commission' | 'markup',
    rate?: number
  ) {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === vendorId && acc.vendorData) {
          const updatedVendor: VendorDetails = {
            ...acc.vendorData,
            paymentModel: model,
            commissionRate: rate !== undefined ? rate : acc.vendorData.commissionRate,
          }
          if (activeVendorModal?.id === vendorId) {
            setActiveVendorModal(updatedVendor)
          }
          return { ...acc, vendorData: updatedVendor }
        }
        return acc
      })
    )
  }

  // Toggle item availability
  function toggleItemStock(vendorId: string, itemId: string) {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === vendorId && acc.vendorData) {
          const updatedMenu = acc.vendorData.menu.map((item) =>
            item.id === itemId ? { ...item, inStock: !item.inStock } : item
          )
          const updatedVendor: VendorDetails = { ...acc.vendorData, menu: updatedMenu }
          if (activeVendorModal?.id === vendorId) {
            setActiveVendorModal(updatedVendor)
          }
          return { ...acc, vendorData: updatedVendor }
        }
        return acc
      })
    )
  }

  // Delete item from menu
  function deleteMenuItem(vendorId: string, itemId: string) {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === vendorId && acc.vendorData) {
          const updatedMenu = acc.vendorData.menu.filter((item) => item.id !== itemId)
          const updatedVendor: VendorDetails = { ...acc.vendorData, menu: updatedMenu }
          if (activeVendorModal?.id === vendorId) {
            setActiveVendorModal(updatedVendor)
          }
          return { ...acc, vendorData: updatedVendor }
        }
        return acc
      })
    )
  }

  // Add New Dish to Vendor Menu
  function handleAddNewDish(vendorId: string) {
    if (!newDish.name.trim() || !newDish.basePrice) return

    const baseVal = parseFloat(newDish.basePrice) || 0
    const markupVal = newDish.markupPrice ? parseFloat(newDish.markupPrice) : baseVal

    const createdItem: MenuItem = {
      id: `m_${Date.now()}`,
      name: newDish.name,
      category: newDish.category || 'Mains',
      isVeg: newDish.isVeg,
      basePrice: baseVal,
      markupPrice: markupVal,
      inStock: true,
      description: newDish.description || 'Delicious freshly prepared dish.',
    }

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === vendorId && acc.vendorData) {
          const updatedMenu = [...acc.vendorData.menu, createdItem]
          const updatedVendor: VendorDetails = { ...acc.vendorData, menu: updatedMenu }
          if (activeVendorModal?.id === vendorId) {
            setActiveVendorModal(updatedVendor)
          }
          return { ...acc, vendorData: updatedVendor }
        }
        return acc
      })
    )

    // Reset Form
    setNewDish({
      name: '',
      category: 'Mains',
      isVeg: true,
      basePrice: '',
      markupPrice: '',
      description: '',
    })
    setIsAddingDish(false)
  }

  // Save Dish Edit
  function handleSaveDishEdit(vendorId: string, itemId: string) {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === vendorId && acc.vendorData) {
          const updatedMenu = acc.vendorData.menu.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  name: editDishData.name,
                  category: editDishData.category,
                  isVeg: editDishData.isVeg,
                  basePrice: editDishData.basePrice,
                  markupPrice: editDishData.markupPrice,
                  description: editDishData.description,
                }
              : item
          )
          const updatedVendor: VendorDetails = { ...acc.vendorData, menu: updatedMenu }
          if (activeVendorModal?.id === vendorId) {
            setActiveVendorModal(updatedVendor)
          }
          return { ...acc, vendorData: updatedVendor }
        }
        return acc
      })
    )
    setEditingDishId(null)
  }

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = selectedRoleFilter === 'all' || acc.role === selectedRoleFilter
    const matchesQuery =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesQuery
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#18201c]">Registered User & Vendor Accounts</h3>
            <p className="text-xs text-[#737e77]">
              Manage accounts across Customer, Vendor, Driver, and Admin roles. Open vendor overview
              to alter payment modes & menu items.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-[#dfe4dc] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#86a018]"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
              {['all', 'customer', 'vendor', 'driver', 'admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition ${
                    selectedRoleFilter === r
                      ? 'bg-[#18201c] text-white'
                      : 'text-gray-600 hover:text-[#18201c]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#323d36]"
            >
              <Plus className="size-4" /> Add User
            </button>
          </div>
        </div>

        {/* Mobile Responsive Account Cards (visible on mobile screens < md) */}
        <div className="flex flex-col gap-3.5 mt-6 block md:hidden">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-2xl border border-gray-200 p-4 bg-white flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {acc.role === 'vendor' && (
                    <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Store className="size-4" />
                    </span>
                  )}
                  <div>
                    <p className="font-bold text-sm text-[#18201c] leading-snug">{acc.name}</p>
                    <p className="text-xs text-gray-500 font-medium">{acc.email}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                    acc.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : acc.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {acc.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    acc.role === 'vendor'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {acc.role}
                </span>

                {acc.vendorData ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                      acc.vendorData.paymentModel === 'markup'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <Tag className="size-3" />
                    {acc.vendorData.paymentModel === 'markup'
                      ? 'Price Markup Model'
                      : `Commission (${acc.vendorData.commissionRate}%)`}
                  </span>
                ) : (
                  <span className="text-gray-500 font-medium">{acc.detail}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                {acc.vendorData && (
                  <button
                    onClick={() => {
                      setActiveVendorModal(acc.vendorData!)
                      setIsAddingDish(false)
                      setEditingDishId(null)
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition shadow-sm"
                  >
                    <ChefHat className="size-3.5 text-[#d9f447]" /> Menu
                  </button>
                )}

                <button
                  onClick={() => toggleAccountStatus(acc.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold border transition ${
                    acc.status === 'active'
                      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {acc.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop & Tablet Table (Hidden on small mobile screens, horizontally scrollable with min-width) */}
        <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-gray-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">User / Name</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Email Address</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Role Type</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Payment Model / Details</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-[#18201c] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {acc.role === 'vendor' && (
                        <span className="grid size-6 place-items-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                          <Store className="size-3.5" />
                        </span>
                      )}
                      <span>{acc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{acc.email}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        acc.role === 'vendor'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
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
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {acc.vendorData ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border ${
                          acc.vendorData.paymentModel === 'markup'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <Tag className="size-3" />
                        {acc.vendorData.paymentModel === 'markup'
                          ? 'Price Markup Model'
                          : `Commission (${acc.vendorData.commissionRate}%)`}
                      </span>
                    ) : (
                      <span className="text-gray-500">{acc.detail}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {acc.vendorData && (
                        <button
                          onClick={() => {
                            setActiveVendorModal(acc.vendorData!)
                            setIsAddingDish(false)
                            setEditingDishId(null)
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-3 py-1 text-[11px] font-bold text-white hover:bg-black transition shadow-sm"
                        >
                          <ChefHat className="size-3.5 text-[#d9f447]" /> Restaurant Overview & Menu
                        </button>
                      )}

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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTAURANT OVERVIEW & MENU MODAL DRAWER */}
      {activeVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl border border-[#dfe4dc] my-8 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#f0f3ec] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#f1f6d9] text-[#6a8014] font-bold text-xl">
                  <Utensils className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#18201c]">{activeVendorModal.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        activeVendorModal.kitchenStatus === 'open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Kitchen {activeVendorModal.kitchenStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Owner: {activeVendorModal.ownerName} · {activeVendorModal.cuisine} ·{' '}
                    {activeVendorModal.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveVendorModal(null)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-1">
              {/* PAYMENT MODEL & SETTLEMENT MODE SELECTION */}
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="size-5 text-purple-700" />
                    <div>
                      <h4 className="font-bold text-sm text-[#18201c]">
                        Payment & Revenue Settlement Mode
                      </h4>
                      <p className="text-xs text-gray-600">
                        Select how platform earns revenue from this restaurant:
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-purple-200/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                    Current:{' '}
                    {activeVendorModal.paymentModel === 'commission'
                      ? `${activeVendorModal.commissionRate}% Commission Cut`
                      : 'Price Markup Model'}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {/* Mode 1: Commission Model */}
                  <div
                    onClick={() => updateVendorPaymentModel(activeVendorModal.id, 'commission', 15)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      activeVendorModal.paymentModel === 'commission'
                        ? 'border-emerald-500 bg-white shadow-md ring-2 ring-emerald-500/20'
                        : 'border-gray-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                          <DollarSign className="size-4" />
                        </span>
                        <span className="font-bold text-xs text-[#18201c]">
                          Option 1: Percentage Commission
                        </span>
                      </div>
                      {activeVendorModal.paymentModel === 'commission' && (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">
                      We deduct an agreed commission cut (e.g. <strong>15%</strong>) from total
                      order sales. The restaurant receives 85% net payout.
                    </p>
                    {activeVendorModal.paymentModel === 'commission' && (
                      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-600">
                          Commission Rate:
                        </span>
                        <input
                          type="number"
                          value={activeVendorModal.commissionRate}
                          onChange={(e) =>
                            updateVendorPaymentModel(
                              activeVendorModal.id,
                              'commission',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 rounded-lg border border-gray-300 px-2 py-0.5 text-xs font-bold outline-none"
                        />
                        <span className="text-xs font-bold text-emerald-700">%</span>
                      </div>
                    )}
                  </div>

                  {/* Mode 2: Price Markup Model */}
                  <div
                    onClick={() => updateVendorPaymentModel(activeVendorModal.id, 'markup')}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      activeVendorModal.paymentModel === 'markup'
                        ? 'border-purple-500 bg-white shadow-md ring-2 ring-purple-500/20'
                        : 'border-gray-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-xl bg-purple-100 text-purple-800">
                          <Sparkles className="size-4" />
                        </span>
                        <span className="font-bold text-xs text-[#18201c]">
                          Option 2: Item Price Markup
                        </span>
                      </div>
                      {activeVendorModal.paymentModel === 'markup' && (
                        <CheckCircle2 className="size-4 text-purple-600" />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">
                      We negotiate fixed agreed dish cost with vendor (e.g. ₹130) and list on app
                      with markup price (e.g. ₹180). We keep 100% of markup profit!
                    </p>
                    {activeVendorModal.paymentModel === 'markup' && (
                      <div className="mt-3 text-[11px] font-bold text-purple-800 pt-2 border-t border-purple-100">
                        ⚡ Active: Customize markup price per item in menu below!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MENU MANAGEMENT SECTION */}
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h4 className="font-bold text-base text-[#18201c]">
                      Restaurant Menu ({activeVendorModal.menu.length} Dishes)
                    </h4>
                    <p className="text-xs text-gray-500">
                      Add, edit, alter pricing parameters, or toggle item availability.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddingDish((v) => !v)}
                    className="flex items-center gap-1.5 rounded-full bg-[#d9f447] px-3.5 py-1.5 text-xs font-bold text-[#121815] hover:bg-[#cbe633] transition shadow-xs"
                  >
                    <Plus className="size-4" /> Add New Dish
                  </button>
                </div>

                {/* ADD NEW DISH FORM */}
                {isAddingDish && (
                  <div className="mt-4 rounded-2xl border border-[#d9f447] bg-[#fcfdf6] p-4 space-y-3">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#6a8014] flex items-center gap-1.5">
                      <Plus className="size-3.5" /> Create New Menu Item
                    </h5>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        placeholder="Dish Name (e.g. Paneer Tikka)"
                        value={newDish.name}
                        onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                      />
                      <select
                        value={newDish.category}
                        onChange={(e) => setNewDish({ ...newDish, category: e.target.value })}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none bg-white"
                      >
                        <option value="Starters">Starters</option>
                        <option value="Mains">Mains</option>
                        <option value="Bowls">Bowls</option>
                        <option value="Wraps">Wraps</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Desserts">Desserts</option>
                      </select>
                      <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-3 py-1 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer font-semibold text-emerald-700">
                          <input
                            type="radio"
                            name="vegNonveg"
                            checked={newDish.isVeg}
                            onChange={() => setNewDish({ ...newDish, isVeg: true })}
                          />{' '}
                          Veg
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer font-semibold text-rose-700">
                          <input
                            type="radio"
                            name="vegNonveg"
                            checked={!newDish.isVeg}
                            onChange={() => setNewDish({ ...newDish, isVeg: false })}
                          />{' '}
                          Non-Veg
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
                          Base Agreed Cost (Vendor Payout ₹)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 150"
                          value={newDish.basePrice}
                          onChange={(e) => setNewDish({ ...newDish, basePrice: e.target.value })}
                          className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
                          Customer Listing Price (App Price ₹)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 210"
                          value={newDish.markupPrice}
                          onChange={(e) => setNewDish({ ...newDish, markupPrice: e.target.value })}
                          className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Short Description (Ingredients, taste notes...)"
                      value={newDish.description}
                      onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setIsAddingDish(false)}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddNewDish(activeVendorModal.id)}
                        className="rounded-full bg-[#18201c] px-4 py-1.5 text-xs font-bold text-white hover:bg-black"
                      >
                        Save Dish to Menu
                      </button>
                    </div>
                  </div>
                )}

                {/* DISH ITEMS LIST */}
                <div className="mt-4 space-y-3">
                  {activeVendorModal.menu.map((item) => {
                    const markupProfit = item.markupPrice - item.basePrice
                    const isEditing = editingDishId === item.id

                    if (isEditing) {
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-blue-300 bg-blue-50/40 p-4 space-y-3"
                        >
                          <h5 className="font-bold text-xs text-blue-900">
                            Editing Dish: {item.name}
                          </h5>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500">
                                Dish Name
                              </label>
                              <input
                                type="text"
                                value={editDishData.name}
                                onChange={(e) =>
                                  setEditDishData({ ...editDishData, name: e.target.value })
                                }
                                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1 text-xs outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500">
                                Category
                              </label>
                              <input
                                type="text"
                                value={editDishData.category}
                                onChange={(e) =>
                                  setEditDishData({ ...editDishData, category: e.target.value })
                                }
                                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1 text-xs outline-none bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500">
                                Base Agreed Cost (₹)
                              </label>
                              <input
                                type="number"
                                value={editDishData.basePrice}
                                onChange={(e) =>
                                  setEditDishData({
                                    ...editDishData,
                                    basePrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1 text-xs outline-none bg-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500">
                                Customer Listing Price (₹)
                              </label>
                              <input
                                type="number"
                                value={editDishData.markupPrice}
                                onChange={(e) =>
                                  setEditDishData({
                                    ...editDishData,
                                    markupPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full mt-1 rounded-xl border border-gray-300 px-3 py-1 text-xs outline-none bg-white font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingDishId(null)}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveDishEdit(activeVendorModal.id, item.id)}
                              className="rounded-full bg-blue-700 px-4 py-1 text-xs font-bold text-white hover:bg-blue-800"
                            >
                              Update Item
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between hover:border-gray-300 transition"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 grid size-4 place-items-center rounded-sm border ${
                              item.isVeg
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-rose-600 text-rose-600'
                            }`}
                          >
                            <span
                              className={`size-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`}
                            />
                          </span>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#18201c]">{item.name}</span>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-600">
                                {item.category}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t border-gray-100 pt-2 sm:border-t-0 sm:pt-0">
                          {/* Price details depending on payment model */}
                          <div className="text-right text-xs">
                            <p className="font-bold text-sm text-[#18201c]">₹{item.markupPrice}</p>
                            {activeVendorModal.paymentModel === 'markup' ? (
                              <p className="text-[10px] text-purple-700 font-semibold">
                                Vendor payout: ₹{item.basePrice} (Markup Profit: +₹{markupProfit})
                              </p>
                            ) : (
                              <p className="text-[10px] text-emerald-700 font-semibold">
                                Vendor gets ~₹
                                {Math.round(
                                  item.markupPrice * (1 - activeVendorModal.commissionRate / 100)
                                )}
                              </p>
                            )}
                          </div>

                          {/* Stock Toggle */}
                          <button
                            onClick={() => toggleItemStock(activeVendorModal.id, item.id)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                              item.inStock
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                            }`}
                          >
                            {item.inStock ? 'In Stock' : 'Out of Stock'}
                          </button>

                          {/* Edit Item Button */}
                          <button
                            onClick={() => {
                              setEditingDishId(item.id)
                              setEditDishData({
                                name: item.name,
                                category: item.category,
                                isVeg: item.isVeg,
                                basePrice: item.basePrice,
                                markupPrice: item.markupPrice,
                                description: item.description,
                              })
                            }}
                            className="grid size-7 place-items-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <Edit3 className="size-3.5" />
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => deleteMenuItem(activeVendorModal.id, item.id)}
                            className="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-[#f0f3ec] pt-4 text-xs">
              <span className="text-gray-500">
                FSSAI License:{' '}
                <strong className="text-[#18201c]">{activeVendorModal.fssaiLicense}</strong> · Bank:{' '}
                <strong className="text-[#18201c]">{activeVendorModal.bankAccount}</strong>
              </span>

              <button
                onClick={() => setActiveVendorModal(null)}
                className="rounded-full bg-[#18201c] px-5 py-2 font-bold text-white hover:bg-black"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">Create New User Account</h3>
                <p className="text-xs text-gray-500">
                  Add a new Customer, Vendor, Driver, or Admin account to the platform.
                </p>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 flex flex-col gap-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Full Name / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma or Biryani Blues"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Account Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] bg-white capitalize"
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Kitchen Vendor</option>
                    <option value="driver">Delivery Driver</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Initial Status *</label>
                  <select
                    value={newUserForm.status}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        status: e.target.value as 'active' | 'pending',
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] bg-white capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Detail / Description</label>
                <input
                  type="text"
                  placeholder={
                    newUserForm.role === 'vendor'
                      ? 'e.g. North Indian & Mughlai'
                      : newUserForm.role === 'driver'
                        ? 'e.g. Ather 450X EV'
                        : 'e.g. Premium Customer'
                  }
                  value={newUserForm.detail}
                  onChange={(e) => setNewUserForm({ ...newUserForm, detail: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-full border border-gray-300 px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18201c] px-5 py-2 font-bold text-white shadow-md hover:bg-black"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
