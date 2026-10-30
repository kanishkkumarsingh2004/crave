'use client'

import { Layers, Store, Tag, Zap } from 'lucide-react'
import type { DbData } from './types'

interface DatabaseInspectorTabsProps {
  activeTab: 'db_config' | 'db_restaurants' | 'db_coupons' | 'db_orders'
  dbData: DbData | null
}

export default function DatabaseInspectorTabs({ activeTab, dbData }: DatabaseInspectorTabsProps) {
  if (activeTab === 'db_config') {
    return (
      <div className="bg-white dark:bg-[#151c18] border border-gray-200 dark:border-[#26332b] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
        <h3 className="text-base font-bold text-[#18201c] dark:text-[#d9f447] flex items-center gap-2">
          <Zap className="size-4" /> Active Database Payment Configuration
        </h3>
        <pre className="bg-gray-900 dark:bg-[#0b0e0d] p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-gray-800 dark:border-[#232e27]">
          {JSON.stringify(dbData?.paymentConfig || {}, null, 2)}
        </pre>
      </div>
    )
  }

  if (activeTab === 'db_restaurants') {
    return (
      <div className="bg-white dark:bg-[#151c18] border border-gray-200 dark:border-[#26332b] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
        <h3 className="text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
          <Store className="size-4 text-orange-500 dark:text-orange-400" /> Loaded DB Restaurants (
          {dbData?.restaurants?.length || 0})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dbData?.restaurants?.map((rest) => (
            <div
              key={rest.id}
              className="bg-gray-50 dark:bg-[#0f1412] p-4 rounded-xl border border-gray-200 dark:border-[#232e27] space-y-1 text-xs"
            >
              <p className="font-bold text-[#18201c] dark:text-white text-sm">{rest.name}</p>
              <p className="text-gray-500 dark:text-gray-400">{rest.cuisine || 'Cuisine N/A'}</p>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-[#1f2923] text-gray-600 dark:text-gray-300 font-mono">
                <span>Commission Rate:</span>
                <span className="text-[#18201c] dark:text-[#d9f447] font-bold">
                  {rest.commission_rate ?? 15}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activeTab === 'db_coupons') {
    return (
      <div className="bg-white dark:bg-[#151c18] border border-gray-200 dark:border-[#26332b] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
        <h3 className="text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
          <Tag className="size-4 text-[#18201c] dark:text-[#d9f447]" /> Loaded DB Active Coupons (
          {dbData?.coupons?.length || 0})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dbData?.coupons?.map((coup) => (
            <div
              key={coup.id}
              className="bg-gray-50 dark:bg-[#0f1412] p-4 rounded-xl border border-gray-200 dark:border-[#232e27] space-y-1 text-xs"
            >
              <span className="font-mono font-extrabold text-[#18201c] bg-gray-200 dark:text-[#d9f447] dark:bg-[#d9f447]/10 px-2 py-0.5 rounded">
                {coup.code}
              </span>
              <p className="text-gray-600 dark:text-gray-300 pt-1">{coup.description}</p>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-[#1f2923] text-gray-600 dark:text-gray-300 font-mono">
                <span>Discount Value:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {coup.discount_type === 'percentage'
                    ? `${coup.discount_value}%`
                    : `₹${coup.discount_value}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activeTab === 'db_orders') {
    return (
      <div className="bg-white dark:bg-[#151c18] border border-gray-200 dark:border-[#26332b] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-xl">
        <h3 className="text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
          <Layers className="size-4 text-purple-500 dark:text-purple-400" /> Recent Database Orders
          ({dbData?.orders?.length || 0})
        </h3>
        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#28352e] text-gray-500 dark:text-gray-400 uppercase text-[10px] bg-gray-50 dark:bg-transparent">
                <th className="py-2 px-3">Order ID</th>
                <th className="py-2 px-3">Customer</th>
                <th className="py-2 px-3">Restaurant</th>
                <th className="py-2 px-3">Subtotal</th>
                <th className="py-2 px-3">Total Amount</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e2722] text-gray-700 dark:text-gray-300">
              {dbData?.orders?.map((ord) => (
                <tr key={ord.id} className="hover:bg-gray-50 dark:hover:bg-[#1b241f] transition">
                  <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
                    {ord.id.slice(0, 10)}...
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#18201c] dark:text-white">
                    {ord.customer_name}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                    {ord.restaurant_name}
                  </td>
                  <td className="py-2.5 px-3 font-medium">₹{ord.subtotal}</td>
                  <td className="py-2.5 px-3 text-[#18201c] dark:text-[#d9f447] font-bold">
                    ₹{ord.total_amount}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-gray-700 dark:text-gray-300 text-[10px] uppercase font-bold">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return null
}
