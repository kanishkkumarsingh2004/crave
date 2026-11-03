import type { CustomerAddressDTO } from '@/lib/dal/addresses'

export function toAddressRealtimeDto(address: CustomerAddressDTO) {
  return {
    id: address.id,
    label: address.label,
    address: address.address,
    is_default: address.is_default,
    latitude: address.latitude,
    longitude: address.longitude,
    created_at: address.created_at,
  }
}

export function toSettlementRealtimeDto(settlement: any) {
  if (!settlement) return null
  return {
    id: settlement.id,
    restaurant_id: settlement.restaurant_id,
    restaurant_name: settlement.restaurant_name,
    gross_sales: settlement.gross_sales,
    commission_rate: settlement.commission_rate,
    commission_amount: settlement.commission_amount,
    net_payout: settlement.net_payout,
    status: settlement.status,
    payout_date: settlement.payout_date,
    period_start: settlement.period_start,
    period_end: settlement.period_end,
    transaction_ref: settlement.transaction_ref,
  }
}
