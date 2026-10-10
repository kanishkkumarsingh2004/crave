'use client'

import {
  CommercialContract,
  CommissionBasis,
  CommissionModel,
  DEFAULT_COMMERCIAL_CONTRACT,
  GstRegistrationStatus,
  PriceTaxMode,
} from '@/lib/commercial-engine'
import { useToast } from '@/lib/toast-context'
import {
  CheckCircle2,
  Edit3,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function CommercialContractsPage() {
  const { toast } = useToast()

  const [contracts, setContracts] = useState<CommercialContract[]>([])

  const [restaurantsList, setRestaurantsList] = useState<
    { id: string; name: string; address?: string }[]
  >([])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<CommercialContract | null>(null)

  // Form Fields
  const [restaurantIdInput, setRestaurantIdInput] = useState('')
  const [contractNumberInput, setContractNumberInput] = useState('')
  const [versionInput, setVersionInput] = useState<number>(1)
  const [statusInput, setStatusInput] = useState<any>('ACTIVE')
  const [effectiveFromInput, setEffectiveFromInput] = useState('')
  const [effectiveUntilInput, setEffectiveUntilInput] = useState('')
  const [commercialModelInput, setCommercialModelInput] = useState<any>('commission')
  const [commissionModelInput, setCommissionModelInput] = useState<CommissionModel>('PERCENTAGE')
  const [commissionRateInput, setCommissionRateInput] = useState<number | ''>(15)
  const [markupRateInput, setMarkupRateInput] = useState<number | ''>(0)
  const [fixedCommissionInput, setFixedCommissionInput] = useState<number | ''>(0)
  const [commissionBasisInput, setCommissionBasisInput] =
    useState<CommissionBasis>('ORDER_SUBTOTAL')
  const [priceTaxModeInput, setPriceTaxModeInput] = useState<PriceTaxMode>('TAX_INCLUSIVE')
  const [supplierStateInput, setSupplierStateInput] = useState('Karnataka')
  const [gstinInput, setGstinInput] = useState('')
  const [gstStatusInput, setGstStatusInput] = useState<GstRegistrationStatus>('REGISTERED')
  const [fssaiLicenseInput, setFssaiLicenseInput] = useState('')

  useEffect(() => {
    fetch('/api/restaurants')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.restaurants)) {
          setRestaurantsList(
            data.restaurants.map((r: any) => ({
              id: r.id,
              name: r.name || 'Partner Kitchen Store',
              address: r.address || 'Bengaluru, India',
            }))
          )
        }
      })
      .catch((err) => console.warn('Could not load restaurants for contract form:', err))
  }, [])

  useEffect(() => {
    fetch('/api/admin/commercial-contracts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.contracts)) {
          setContracts(data.contracts)
        }
      })
      .catch((err) => console.warn('Could not load commercial contracts:', err))
  }, [])

  function openCreateModal() {
    setEditingContract(null)
    setRestaurantIdInput(restaurantsList[0]?.id || '')
    setContractNumberInput(
      `CRV-CC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
    )
    setVersionInput(1)
    setStatusInput('ACTIVE')
    setEffectiveFromInput(new Date().toISOString().split('T')[0])
    setEffectiveUntilInput('')
    setCommercialModelInput('commission')
    setCommissionModelInput('PERCENTAGE')
    setCommissionRateInput(15)
    setMarkupRateInput(0)
    setFixedCommissionInput(0)
    setCommissionBasisInput('ORDER_SUBTOTAL')
    setPriceTaxModeInput('TAX_INCLUSIVE')
    setSupplierStateInput('')
    setGstinInput('')
    setGstStatusInput('REGISTERED')
    setFssaiLicenseInput('')
    setShowModal(true)
  }

  function openEditModal(contract: CommercialContract) {
    setEditingContract(contract)
    setRestaurantIdInput(contract.restaurantId)
    setContractNumberInput(contract.contractNumber)
    setVersionInput(contract.version)
    setStatusInput(contract.status)
    setEffectiveFromInput(contract.effectiveFrom)
    setEffectiveUntilInput(contract.effectiveUntil || '')
    setCommercialModelInput(contract.commercialModel || 'commission')
    setCommissionModelInput(contract.commissionModel || 'PERCENTAGE')
    setCommissionRateInput(contract.commissionRate)
    setMarkupRateInput(contract.markupRate ?? 0)
    setFixedCommissionInput(contract.fixedCommissionAmount || 0)
    setCommissionBasisInput(contract.commissionBasis)
    setPriceTaxModeInput(contract.priceTaxMode)
    setSupplierStateInput(contract.supplierState)
    setGstinInput(contract.gstin || '')
    setGstStatusInput(contract.gstStatus)
    setFssaiLicenseInput(contract.fssaiLicense || '')
    setShowModal(true)
  }

  function handleSaveContract(e: React.FormEvent) {
    e.preventDefault()
    if (!contractNumberInput.trim() || commissionRateInput === '') return

    const newContract: CommercialContract = {
      id: editingContract ? editingContract.id : `cc_${Date.now()}`,
      restaurantId: restaurantIdInput,
      contractNumber: contractNumberInput.trim().toUpperCase(),
      version: editingContract ? versionInput + 1 : versionInput,
      status: statusInput,
      effectiveFrom: effectiveFromInput,
      effectiveUntil: effectiveUntilInput || null,
      currency: 'INR',
      commercialModel: commercialModelInput,
      commissionModel: commissionModelInput,
      commissionRate: Number(commissionRateInput),
      markupRate: Number(markupRateInput) || 0,
      fixedCommissionAmount: Number(fixedCommissionInput) || undefined,
      commissionBasis: commissionBasisInput,
      commissionPayer: 'RESTAURANT',
      priceTaxMode: priceTaxModeInput,
      supplierState: supplierStateInput,
      gstin: gstinInput,
      gstStatus: gstStatusInput,
      fssaiLicense: fssaiLicenseInput,
      createdAt: editingContract ? editingContract.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingContract) {
      setContracts((prev) => prev.map((c) => (c.id === editingContract.id ? newContract : c)))
      toast(
        `Commercial Contract '${newContract.contractNumber}' updated (V${newContract.version})!`,
        'success'
      )
    } else {
      setContracts((prev) => [newContract, ...prev])
      toast(`Created & activated contract '${newContract.contractNumber}'!`, 'success')
    }

    setShowModal(false)
  }

  function handleDeleteContract(id: string, num: string) {
    if (!confirm(`Are you sure you want to terminate contract '${num}'?`)) return
    setContracts((prev) => prev.filter((c) => c.id !== id))
    toast(`Contract '${num}' removed.`, 'info')
  }

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.supplierState.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#dfe4dc] dark:border-[#27342d] pb-5 gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#b5de28] dark:text-[#d9f447]">
            Commercial &amp; Financial Governance
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Commercial Contracts &amp; Rule Engine
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Manage partner commission structures, versioned effective contracts, GST registration
            contexts, and tax pricing modes.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-3 text-xs font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c6e336] transition active:scale-95 shrink-0"
        >
          <Plus className="size-4 text-[#d9f447] dark:text-[#121815]" /> Add Commercial Contract
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-4 text-xs">
        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-gray-400 block">
            Total Contracts
          </span>
          <p className="mt-2 text-3xl font-extrabold text-[#18201c] dark:text-white">
            {contracts.length}
          </p>
          <span className="mt-1 text-[11px] text-gray-500 block">
            Versioned &amp; Effective-dated
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
            Active Contracts
          </span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
            {contracts.filter((c) => c.status === 'ACTIVE').length}
          </p>
          <span className="mt-1 text-[11px] text-emerald-600 block">
            Applying to live checkout orders
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">
            Avg Commission Rate
          </span>
          <p className="mt-2 text-3xl font-extrabold text-amber-700 dark:text-amber-400">
            {Math.round(
              contracts.reduce((sum, c) => sum + c.commissionRate, 0) / (contracts.length || 1)
            )}
            %
          </p>
          <span className="mt-1 text-[11px] text-gray-500 block">
            Percentage / Hybrid commission
          </span>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 block">
            GST Registered Vendors
          </span>
          <p className="mt-2 text-3xl font-extrabold text-purple-700 dark:text-purple-400">
            {contracts.filter((c) => c.gstStatus === 'REGISTERED').length}
          </p>
          <span className="mt-1 text-[11px] text-gray-500 block">Input tax credit eligible</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#18201c] p-4 rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by contract #, state, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] py-2 pl-10 pr-4 font-medium text-gray-900 dark:text-white outline-none focus:border-[#86a018]"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 dark:bg-[#121815] p-1 font-bold">
          {['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-[11px] transition ${
                statusFilter === st
                  ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] overflow-hidden shadow-xs text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-[#121815] text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase border-b border-gray-200 dark:border-[#27342d]">
              <tr>
                <th className="py-3.5 px-4">Contract # &amp; Version</th>
                <th className="py-3.5 px-4">Partner Store</th>
                <th className="py-3.5 px-4">Commission Rules</th>
                <th className="py-3.5 px-4">Tax &amp; Price Mode</th>
                <th className="py-3.5 px-4">GSTIN &amp; State</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] font-medium">
              {filteredContracts.map((c) => {
                const restObj = restaurantsList.find((r) => r.id === c.restaurantId)
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-[#202923]/60 transition"
                  >
                    <td className="py-4 px-4 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                          {c.contractNumber}
                        </span>
                        <span className="text-[10px] bg-gray-100 dark:bg-[#121815] px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                          V{c.version}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1">
                        Effective: {c.effectiveFrom}{' '}
                        {c.effectiveUntil ? `to ${c.effectiveUntil}` : '(Ongoing)'}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-[#18201c] dark:text-white">
                      {restObj?.name || `Restaurant ID: ${c.restaurantId}`}
                      <span className="text-[10px] text-gray-400 font-normal block">
                        Lic: {c.fssaiLicense || 'N/A'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-xs">
                        {c.commissionModel === 'HYBRID'
                          ? `${c.commissionRate}% + ₹${c.fixedCommissionAmount}`
                          : `${c.commissionRate}% Commission`}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        Basis: {c.commissionBasis}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#18201c] dark:text-white">
                        <Tag className="size-3 text-[#b5de28]" /> {c.priceTaxMode}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs">
                      {c.gstin || 'UNREGISTERED'}
                      <span className="text-[10px] text-gray-400 block font-sans">
                        {c.supplierState} ({c.gstStatus})
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                            : c.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300'
                        }`}
                      >
                        <CheckCircle2 className="size-3" /> {c.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="grid size-8 place-items-center rounded-xl bg-gray-100 dark:bg-[#121815] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#202923] transition"
                          title="Edit Contract"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContract(c.id, c.contractNumber)}
                          className="grid size-8 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                          title="Terminate Contract"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#18201c] p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] text-[#18201c] dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b5de28] dark:text-[#d9f447]">
                  Commercial Contract Governance
                </span>
                <h3 className="text-lg font-bold text-[#18201c] dark:text-white">
                  {editingContract
                    ? `Edit Contract ${editingContract.contractNumber}`
                    : 'Create New Commercial Contract'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] text-gray-500 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="mt-4 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold">Contract Number *</label>
                  <input
                    type="text"
                    required
                    value={contractNumberInput}
                    onChange={(e) => setContractNumberInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono uppercase font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold">Partner Store *</label>
                  <select
                    value={restaurantIdInput}
                    onChange={(e) => setRestaurantIdInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    {restaurantsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold">Commercial Model</label>
                  <select
                    value={commercialModelInput}
                    onChange={(e) => setCommercialModelInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="commission">Commission (%)</option>
                    <option value="markup">Markup (%)</option>
                    <option value="hybrid">Hybrid (% Comm + % Mkp)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold">Commission Rate (%) *</label>
                  <input
                    type="number"
                    required
                    disabled={commercialModelInput === 'markup'}
                    value={commissionRateInput}
                    onChange={(e) =>
                      setCommissionRateInput(
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold">Markup Rate (%)</label>
                  <input
                    type="number"
                    disabled={commercialModelInput === 'commission'}
                    value={markupRateInput}
                    onChange={(e) =>
                      setMarkupRateInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold">Calculation Basis</label>
                  <select
                    value={commissionBasisInput}
                    onChange={(e) => setCommissionBasisInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="ORDER_SUBTOTAL">ORDER_SUBTOTAL</option>
                    <option value="ITEM_SUBTOTAL">ITEM_SUBTOTAL</option>
                    <option value="TAXABLE_VALUE">TAXABLE_VALUE</option>
                    <option value="CUSTOMER_PAYABLE">CUSTOMER_PAYABLE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold">Price Tax Mode</label>
                  <select
                    value={priceTaxModeInput}
                    onChange={(e) => setPriceTaxModeInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="TAX_INCLUSIVE">TAX_INCLUSIVE</option>
                    <option value="TAX_EXCLUSIVE">TAX_EXCLUSIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstinInput}
                    onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold">GST Status</label>
                  <select
                    value={gstStatusInput}
                    onChange={(e) => setGstStatusInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="UNREGISTERED">UNREGISTERED</option>
                    <option value="COMPOSITION">COMPOSITION</option>
                    <option value="EXEMPT">EXEMPT</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold">Supplier State</label>
                  <input
                    type="text"
                    value={supplierStateInput}
                    onChange={(e) => setSupplierStateInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={effectiveFromInput}
                    onChange={(e) => setEffectiveFromInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold">Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27342d]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full border border-gray-300 dark:border-[#27342d] px-5 py-2.5 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-7 py-2.5 font-bold text-white dark:text-[#121815] shadow-md hover:bg-[#323d36]"
                >
                  {editingContract ? 'Save Contract Changes' : 'Create & Activate Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
