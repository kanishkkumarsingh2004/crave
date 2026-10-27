'use client'

import type { FullCalculatorResult } from '@/lib/calculator'
import { Coins, DollarSign, Sparkles, Store, Truck } from 'lucide-react'

interface EconomicsCardsProps {
  calculatorResult: FullCalculatorResult
  distanceKm: number
  selectedCouponCode: string
}

export default function EconomicsCards({
  calculatorResult,
  distanceKm,
  selectedCouponCode,
}: EconomicsCardsProps) {
  const { customerBilling, vendorSettlement, driverEarnings, platformEconomics } = calculatorResult

  return (
    <div className="space-y-6">
      {/* Unit Economics 4-Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Customer Bill Card */}
        <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-3.5 relative overflow-hidden shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#202923] pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <DollarSign className="size-4 text-[#18201c] dark:text-[#d9f447]" /> Customer Bill
            </span>
            <span className="text-xs font-mono font-bold text-[#18201c] dark:text-[#d9f447]">
              ₹{customerBilling.grandTotal}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Food Subtotal</span>
              <span className="text-[#18201c] dark:text-white font-bold">₹{customerBilling.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Packaging Charge</span>
              <span className="text-[#18201c] dark:text-white">₹{customerBilling.packagingFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Delivery Fee ({distanceKm}km)</span>
              <span className="text-[#18201c] dark:text-white">₹{customerBilling.netDeliveryFee}</span>
            </div>
            {customerBilling.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Coupon ({selectedCouponCode})</span>
                <span>-₹{customerBilling.couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Platform &amp; Handling</span>
              <span className="text-[#18201c] dark:text-white">
                ₹{customerBilling.platformFee + customerBilling.handlingFee}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">GST (18%)</span>
              <span className="text-[#18201c] dark:text-white">₹{customerBilling.gstAmount}</span>
            </div>
            {customerBilling.tip > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Driver Tip</span>
                <span>+₹{customerBilling.tip}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-[#18201c] dark:text-white pt-2.5 border-t border-gray-200 dark:border-[#202923] text-sm">
              <span>Total Paid</span>
              <span className="text-[#18201c] dark:text-[#d9f447]">₹{customerBilling.grandTotal}</span>
            </div>
          </div>
        </div>

        {/* 2. Vendor Net Payout Card */}
        <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-3.5 relative overflow-hidden shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#202923] pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Store className="size-4 text-orange-500 dark:text-orange-400" /> Vendor Payout
            </span>
            <span className="text-xs font-mono font-black text-orange-600 bg-orange-50 border border-orange-200 dark:text-orange-400 dark:bg-orange-400/10 dark:border-orange-400/20 px-2.5 py-1 rounded-lg">
              ₹{vendorSettlement.netVendorPayout}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Gross Food Sales</span>
              <span className="text-[#18201c] dark:text-white font-bold">₹{vendorSettlement.grossSales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Commission Rate</span>
              <span className="text-[#18201c] dark:text-white">{vendorSettlement.commissionRatePercent}%</span>
            </div>
            <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
              <span>Commission Deducted</span>
              <span>-₹{vendorSettlement.commissionDeducted}</span>
            </div>
            <div className="flex justify-between font-extrabold text-[#18201c] dark:text-white pt-2.5 border-t border-gray-200 dark:border-[#202923] text-sm">
              <span>Net Vendor Payout</span>
              <span className="text-orange-600 dark:text-orange-400">
                ₹{vendorSettlement.netVendorPayout}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Driver Earnings Card */}
        <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-3.5 relative overflow-hidden shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#202923] pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Truck className="size-4 text-emerald-500 dark:text-emerald-400" /> Driver Earnings
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ₹{driverEarnings.totalDriverEarnings}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Base Distance Share</span>
              <span className="text-[#18201c] dark:text-white font-bold">
                ₹{driverEarnings.baseDistanceShare}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Extra KM Share</span>
              <span className="text-[#18201c] dark:text-white">₹{driverEarnings.extraDistanceShare}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Surge/Rain Share</span>
              <span className="text-[#18201c] dark:text-white">₹{driverEarnings.surgeRainShare}</span>
            </div>
            {driverEarnings.tip > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>100% Customer Tip</span>
                <span>+₹{driverEarnings.tip}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-[#18201c] dark:text-white pt-2.5 border-t border-gray-200 dark:border-[#202923] text-sm">
              <span>Total Driver Payout</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ₹{driverEarnings.totalDriverEarnings}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Platform Net Profit Card */}
        <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-3.5 relative overflow-hidden shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#202923] pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Coins className="size-4 text-amber-500 dark:text-yellow-400" /> Platform Margin
            </span>
            <span
              className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                platformEconomics.platformNetProfit >= 0
                  ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-yellow-400 dark:bg-yellow-400/10 dark:border-yellow-400/20'
                  : 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-400/10 dark:border-rose-400/20'
              }`}
            >
              ₹{platformEconomics.platformNetProfit} ({platformEconomics.profitMarginPercent}%)
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Customer Paid</span>
              <span className="text-[#18201c] dark:text-white font-bold">
                ₹{platformEconomics.totalCollectedFromCustomer}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Less: Vendor Payout</span>
              <span>-₹{platformEconomics.totalPaidToVendor}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Less: Driver Earnings</span>
              <span>-₹{platformEconomics.totalPaidToDriver}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Less: GST Payable</span>
              <span>-₹{platformEconomics.totalGstCollected}</span>
            </div>
            <div className="flex justify-between font-extrabold text-[#18201c] dark:text-white pt-2.5 border-t border-gray-200 dark:border-[#202923] text-sm">
              <span>Platform Profit Margin</span>
              <span
                className={
                  platformEconomics.platformNetProfit >= 0
                    ? 'text-amber-700 dark:text-yellow-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                ₹{platformEconomics.platformNetProfit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Output Breakdown Table */}
      <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#202923] pb-3">
          <h3 className="text-xs font-extrabold text-[#18201c] dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="size-4 text-[#18201c] dark:text-[#d9f447]" /> Unit Economics Summary
            Table
          </h3>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            Real-time Computation
          </span>
        </div>

        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#202923] text-gray-500 dark:text-gray-400 uppercase text-[10px] bg-gray-50 dark:bg-[#0b0f0d]">
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Revenue / Amount</th>
                <th className="py-2.5 px-3">Outflow / Cost</th>
                <th className="py-2.5 px-3">Net Profit / Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1c241f] text-gray-700 dark:text-gray-300">
              <tr className="hover:bg-gray-50 dark:hover:bg-[#17201b] transition">
                <td className="py-3 px-3 font-bold text-[#18201c] dark:text-white">Customer</td>
                <td className="py-3 px-3 text-[#18201c] dark:text-[#d9f447] font-bold">
                  ₹{customerBilling.grandTotal}
                </td>
                <td className="py-3 px-3 text-gray-400">-</td>
                <td className="py-3 px-3 text-gray-500 dark:text-gray-400">Order Fulfilled</td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-[#17201b] transition">
                <td className="py-3 px-3 font-bold text-[#18201c] dark:text-white">
                  Restaurant Vendor
                </td>
                <td className="py-3 px-3">₹{vendorSettlement.grossSales} (Gross)</td>
                <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-bold">
                  -₹{vendorSettlement.commissionDeducted} (Commission)
                </td>
                <td className="py-3 px-3 text-orange-600 dark:text-orange-400 font-extrabold">
                  ₹{vendorSettlement.netVendorPayout}
                </td>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-[#17201b] transition">
                <td className="py-3 px-3 font-bold text-[#18201c] dark:text-white">Delivery Driver</td>
                <td className="py-3 px-3">₹{driverEarnings.deliveryFeeCollected} (Delivery Fee)</td>
                <td className="py-3 px-3 text-gray-400">-</td>
                <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-extrabold">
                  ₹{driverEarnings.totalDriverEarnings}
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-[#17211b] border-t-2 border-gray-200 dark:border-[#202923]">
                <td className="py-3 px-3 font-black text-[#18201c] dark:text-[#d9f447]">
                  Platform (Crave)
                </td>
                <td className="py-3 px-3 text-amber-700 dark:text-yellow-400 font-bold">
                  ₹{platformEconomics.platformGrossRevenue} (Gross Margin)
                </td>
                <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                  ₹{platformEconomics.totalPaidToDriver + platformEconomics.totalPaidToVendor} (Payouts)
                </td>
                <td className="py-3 px-3 font-black text-amber-700 dark:text-yellow-400 text-sm">
                  ₹{platformEconomics.platformNetProfit} ({platformEconomics.profitMarginPercent}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
