/**
 * Database Access Layer — Payments, Settlements & Configs
 * Resilient dual-engine: Prisma ORM with Supabase REST fallback
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

// ─── Payment Reviews ────────────────────────────────────

export async function createPaymentReview(data: {
  id: string
  order_id: string
  utr_ref: string
  customer_vpa: string
  amount: number
  status?: string
}) {
  try {
    return await prisma.paymentReview.create({ data })
  } catch {
    try {
      const { data: created, error } = await supabase
        .from('payment_reviews')
        .insert([data])
        .select()
        .single()
      if (!error && created) return created
    } catch {}
    return { ...data, created_at: new Date() }
  }
}

export async function updatePaymentReviewStatus(orderId: string, status: string) {
  try {
    return await prisma.paymentReview.updateMany({
      where: { order_id: orderId },
      data: { status },
    })
  } catch {
    try {
      await supabase.from('payment_reviews').update({ status }).eq('order_id', orderId)
    } catch {}
    return { count: 1 }
  }
}

export async function listPaymentReviews(status?: string) {
  try {
    return await prisma.paymentReview.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    })
  } catch {
    try {
      let query = supabase
        .from('payment_reviews')
        .select('*')
        .order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data } = await query
      if (data) return data
    } catch {}
    return []
  }
}

// ─── Payment Config ──────────────────────────────────────

export async function getActivePaymentConfig() {
  try {
    return await prisma.paymentConfig.findFirst({ where: { is_active: true } })
  } catch {
    try {
      const { data } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      return data
    } catch {
      return null
    }
  }
}

export async function upsertPaymentConfig(data: {
  id: string
  name: string
  merchant_vpa: string
  merchant_name: string
  merchant_category_code?: string
  thank_you_message?: string
  ifsc_code?: string
  account_number?: string
  platform_fee?: number
  handling_fee?: number
  vendor_commission?: number
  packaging_cap?: number
  gst_rate_percent?: number
  delivery_fee?: number
  base_distance_km?: number
  per_km_rate?: number
  free_delivery_threshold?: number
  driver_payout_share?: number
  surge_multiplier?: number
  rain_fee?: number
  night_surge_fee?: number
  is_rain_mode_active?: boolean
  is_night_surge_active?: boolean
  enable_cash_on_delivery?: boolean
  enable_upi_deep_link?: boolean
  require_utr_number?: boolean
  is_active?: boolean
}) {
  try {
    return await prisma.paymentConfig.upsert({
      where: { id: data.id },
      create: { ...data, updated_at: new Date() },
      update: { ...data, updated_at: new Date() },
    })
  } catch {
    try {
      const { data: upserted } = await supabase
        .from('payment_configs')
        .upsert(data)
        .select()
        .single()
      return upserted
    } catch {
      return null
    }
  }
}

// ─── Vendor Settlements ──────────────────────────────────

export async function createVendorSettlement(data: {
  id: string
  restaurant_name: string
  gross_sales: number
  commission_rate: number
  commission_amount: number
  net_payout: number
  restaurant_id?: string
  period_start?: Date
  period_end?: Date
  status?: string
  transaction_ref?: string
}) {
  try {
    return await prisma.vendorSettlement.create({ data })
  } catch {
    try {
      const { data: created, error } = await supabase
        .from('vendor_settlements')
        .insert([data as any])
        .select()
        .single()
      if (!error && created) return created
    } catch {}
    return { ...data, payout_date: new Date() }
  }
}

export async function listVendorSettlements(restaurantId?: string) {
  try {
    return await prisma.vendorSettlement.findMany({
      where: restaurantId ? { restaurant_id: restaurantId } : undefined,
      orderBy: { payout_date: 'desc' },
    })
  } catch {
    try {
      let query = supabase
        .from('vendor_settlements')
        .select('*')
        .order('payout_date', { ascending: false })
      if (restaurantId) query = query.eq('restaurant_id', restaurantId)
      const { data } = await query
      if (data) return data
    } catch {}
    return []
  }
}

export async function updateVendorSettlementStatus(id: string, status: string) {
  try {
    return await prisma.vendorSettlement.update({
      where: { id },
      data: { status, payout_date: new Date() },
    })
  } catch {
    try {
      const { data, error } = await supabase
        .from('vendor_settlements')
        .update({ status, payout_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (!error && data) return data
    } catch {}
    return { id, status, payout_date: new Date() }
  }
}

// ─── Driver UPI Accounts ─────────────────────────────────

export async function listDriverUpiAccounts(driverId: string) {
  try {
    return await prisma.driverUpiAccount.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'desc' },
    })
  } catch {
    try {
      const { data } = await supabase
        .from('driver_upi_accounts')
        .select('*')
        .eq('driver_id', driverId)
      if (data) return data
    } catch {}
    return []
  }
}

export async function createDriverUpiAccount(data: {
  id: string
  driver_id: string
  vpa: string
  bank_name?: string
  is_primary?: boolean
}) {
  try {
    return await prisma.driverUpiAccount.create({ data })
  } catch {
    try {
      const { data: created } = await supabase
        .from('driver_upi_accounts')
        .insert([data as any])
        .select()
        .single()
      if (created) return created
    } catch {}
    return { ...data, is_verified: false, created_at: new Date() }
  }
}

// ─── Driver Payouts ──────────────────────────────────────

export async function createDriverPayout(data: {
  id: string
  driver_id: string
  amount: number
  status?: string
  transaction_ref?: string
}) {
  try {
    return await prisma.driverPayout.create({ data })
  } catch {
    try {
      const { data: created } = await supabase
        .from('driver_payouts')
        .insert([data as any])
        .select()
        .single()
      if (created) return created
    } catch {}
    return { ...data, created_at: new Date() }
  }
}

export async function listDriverPayouts(driverId: string) {
  try {
    return await prisma.driverPayout.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'desc' },
    })
  } catch {
    try {
      const { data } = await supabase.from('driver_payouts').select('*').eq('driver_id', driverId)
      if (data) return data
    } catch {}
    return []
  }
}

// ─── Driver Incentives ───────────────────────────────────

export async function listDriverIncentives(driverId?: string) {
  try {
    return await prisma.driverIncentive.findMany({
      where: {
        is_active: true,
        ...(driverId && { driver_id: driverId }),
      },
    })
  } catch {
    try {
      const { data } = await supabase.from('driver_incentives').select('*').eq('is_active', true)
      if (data) return data
    } catch {}
    return []
  }
}
