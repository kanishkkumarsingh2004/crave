export interface VendorFinancialRecord {
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
  weeklyGrossSales: number
  commissionRate: number // %
  packagingCapFee: number // ₹
  promoSubsidyPct: number // %
  settlementStatus: 'pending' | 'settled'
  kitchenStatus: 'open' | 'closed'
  activeOrdersCount: number
  completedDropsCount: number
  settlementIds?: string[]
  disbursedAmount?: number
  transactionRef?: string
  netPayableAmount?: number
  commissionAmount?: number
}

export function getVendorFinancials(v: VendorFinancialRecord) {
  const gross =
    typeof v.weeklyGrossSales === 'number'
      ? v.weeklyGrossSales
      : parseFloat(v.weeklyGrossSales as any) || 0
  const commRate =
    typeof v.commissionRate === 'number'
      ? v.commissionRate
      : parseFloat(v.commissionRate as any) || 0
  const promoPct =
    typeof v.promoSubsidyPct === 'number'
      ? v.promoSubsidyPct
      : parseFloat(v.promoSubsidyPct as any) || 0

  const commissionCut =
    typeof v.commissionAmount === 'number' && v.commissionAmount > 0
      ? v.commissionAmount
      : (gross * commRate) / 100
  const promoCut = (gross * promoPct) / 100
  const netPayable =
    typeof v.netPayableAmount === 'number' && v.netPayableAmount > 0
      ? v.netPayableAmount
      : gross - commissionCut + promoCut
  const finalPayout =
    v.disbursedAmount != null && v.disbursedAmount > 0 ? v.disbursedAmount : netPayable
  return { commissionCut, promoCut, netPayable, finalPayout }
}
