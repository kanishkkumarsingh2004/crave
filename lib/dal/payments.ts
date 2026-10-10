/**
 * Database Access Layer — Payments, Settlements & Configs
 * Prisma ORM with Neon PostgreSQL
 */
import { prisma } from '@/lib/prisma'

// ─── Payment Reviews ────────────────────────────────────

export async function createPaymentReview(data: {
  id: string
  order_id: string
  utr_ref: string
  customer_vpa: string
  amount: number
  status?: 'pending' | 'verified' | 'rejected'
}) {
  return await prisma.paymentReview.create({ data: data as any })
}

export async function updatePaymentReviewStatus(
  orderId: string,
  status: 'pending' | 'verified' | 'rejected'
) {
  return await prisma.paymentReview.updateMany({
    where: { order_id: orderId },
    data: { status: status as any },
  })
}

export async function listPaymentReviews(status?: 'pending' | 'verified' | 'rejected') {
  return await prisma.paymentReview.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { created_at: 'desc' },
  })
}

// ─── Payment Config ──────────────────────────────────────

export async function getActivePaymentConfig() {
  let config = await prisma.paymentConfig.findFirst({ where: { is_active: true } })
  if (!config) {
    config = await prisma.paymentConfig.findFirst({ orderBy: { updated_at: 'desc' } })
  }
  if (config) {
    return {
      ...config,
      ...(config.gst_rate != null && { gst_rate_percent: Number(config.gst_rate) }),
      ...(config.surge_multiplier != null && {
        surge_multiplier: Number(config.surge_multiplier),
      }),
    }
  }
  return null
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
  const { gst_rate_percent, ...rest } = data
  const intFields = [
    'platform_fee',
    'handling_fee',
    'vendor_commission',
    'packaging_cap',
    'delivery_fee',
    'base_distance_km',
    'per_km_rate',
    'free_delivery_threshold',
    'driver_payout_share',
    'rain_fee',
    'night_surge_fee',
  ]
  const cleaned: Record<string, any> = { ...rest }
  for (const k of intFields) {
    if (cleaned[k] != null && typeof cleaned[k] === 'number') {
      cleaned[k] = Math.round(cleaned[k])
    }
  }

  const prismaData = {
    ...cleaned,
    ...(gst_rate_percent != null && { gst_rate: gst_rate_percent }),
    updated_at: new Date(),
  }

  return await prisma.paymentConfig.upsert({
    where: { id: data.id },
    create: prismaData as any,
    update: prismaData as any,
  })
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
  status?: 'scheduled' | 'paid' | 'failed' | 'cancelled'
  transaction_ref?: string
}) {
  return await prisma.vendorSettlement.create({ data: data as any })
}

export async function listVendorSettlements(restaurantId?: string) {
  return await prisma.vendorSettlement.findMany({
    where: restaurantId ? { restaurant_id: restaurantId } : undefined,
    orderBy: { payout_date: 'desc' },
  })
}

export async function updateVendorSettlementStatus(
  id: string,
  status: 'scheduled' | 'paid' | 'failed' | 'cancelled'
) {
  return await prisma.vendorSettlement.update({
    where: { id },
    data: { status, payout_date: new Date() },
  })
}

// ─── Driver UPI Accounts ─────────────────────────────────

export async function listDriverUpiAccounts(driverId: string) {
  return await prisma.driverUpiAccount.findMany({
    where: { driver_id: driverId },
    orderBy: { created_at: 'desc' },
  })
}

export async function createDriverUpiAccount(data: {
  id: string
  driver_id: string
  vpa: string
  bank_name?: string
  is_primary?: boolean
}) {
  return await prisma.driverUpiAccount.create({ data })
}

// ─── Driver Payouts ──────────────────────────────────────

export async function createDriverPayout(data: {
  id: string
  driver_id: string
  amount: number
  status?: 'pending' | 'paid' | 'failed'
  transaction_ref?: string
}) {
  return await prisma.driverPayout.create({ data: data as any })
}

export async function listDriverPayouts(driverId: string) {
  return await prisma.driverPayout.findMany({
    where: { driver_id: driverId },
    orderBy: { created_at: 'desc' },
  })
}

// ─── Driver Incentives ───────────────────────────────────

export async function listDriverIncentives(driverId?: string) {
  return await prisma.driverIncentive.findMany({
    where: {
      is_active: true,
      ...(driverId && { driver_id: driverId }),
    },
  })
}
