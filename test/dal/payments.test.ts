import {
  createPaymentReview,
  updatePaymentReviewStatus,
  listPaymentReviews,
  getActivePaymentConfig,
  upsertPaymentConfig,
  createVendorSettlement,
  listVendorSettlements,
  createDriverPayout,
  listDriverPayouts,
  listDriverIncentives,
} from '@/lib/dal/payments'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => require('../__mocks__/prisma'))

const mockPrisma = prisma as any

describe('Payments DAL', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('createPaymentReview', () => {
    it('creates a payment review record', async () => {
      const reviewData = {
        id: 'pr_1',
        order_id: 'ord_1',
        utr_ref: '123456789012',
        customer_vpa: 'test@upi',
        amount: 500,
        status: 'pending' as const,
      }
      mockPrisma.paymentReview.create = jest.fn().mockResolvedValue(reviewData)

      const result = await createPaymentReview(reviewData)
      expect(result).toEqual(reviewData)
    })
  })

  describe('updatePaymentReviewStatus', () => {
    it('updates payment review status by order_id', async () => {
      mockPrisma.paymentReview.updateMany = jest.fn().mockResolvedValue({ count: 1 })

      const result = await updatePaymentReviewStatus('ord_1', 'verified')
      expect(result).toEqual({ count: 1 })
      expect(mockPrisma.paymentReview.updateMany).toHaveBeenCalledWith({
        where: { order_id: 'ord_1' },
        data: { status: 'verified' },
      })
    })
  })

  describe('listPaymentReviews', () => {
    it('fetches all reviews when no status provided', async () => {
      const mockReviews = [{ id: 'pr_1', status: 'pending' }]
      mockPrisma.paymentReview.findMany = jest.fn().mockResolvedValue(mockReviews)

      const result = await listPaymentReviews()
      expect(result).toEqual(mockReviews)
    })

    it('filters by status when provided', async () => {
      mockPrisma.paymentReview.findMany = jest.fn().mockResolvedValue([])

      await listPaymentReviews('verified')
      expect(mockPrisma.paymentReview.findMany).toHaveBeenCalledWith({
        where: { status: 'verified' },
        orderBy: { created_at: 'desc' },
      })
    })
  })

  describe('getActivePaymentConfig', () => {
    it('fetches first active payment config', async () => {
      const mockConfig = { id: 'cfg_1', name: 'UPI Config', is_active: true }
      mockPrisma.paymentConfig.findFirst = jest.fn().mockResolvedValue(mockConfig)

      const result = await getActivePaymentConfig()
      expect(result).toEqual(mockConfig)
    })

    it('returns null when no active config', async () => {
      mockPrisma.paymentConfig.findFirst = jest.fn().mockResolvedValue(null)

      const result = await getActivePaymentConfig()
      expect(result).toBeNull()
    })
  })

  describe('upsertPaymentConfig', () => {
    it('creates or updates payment config', async () => {
      const configData = {
        id: 'cfg_1',
        name: 'UPI Config',
        merchant_vpa: 'crave@upi',
        merchant_name: 'Crave Foods',
        is_active: true,
      }
      mockPrisma.paymentConfig.upsert = jest.fn().mockResolvedValue(configData)

      const result = await upsertPaymentConfig(configData)
      expect(result).toEqual(configData)
      expect(mockPrisma.paymentConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'cfg_1' },
        create: { ...configData, updated_at: expect.any(Date) },
        update: { ...configData, updated_at: expect.any(Date) },
      })
    })
  })

  describe('createVendorSettlement', () => {
    it('creates a vendor settlement record', async () => {
      const settlementData = {
        id: 'stl_1',
        restaurant_name: 'Spice Garden',
        gross_sales: 50000,
        commission_rate: 15,
        commission_amount: 7500,
        net_payout: 42500,
      }
      mockPrisma.vendorSettlement.create = jest.fn().mockResolvedValue(settlementData)

      const result = await createVendorSettlement(settlementData)
      expect(result).toEqual(settlementData)
    })
  })

  describe('listVendorSettlements', () => {
    it('fetches all settlements without filter', async () => {
      const mockSettlements = [{ id: 'stl_1' }, { id: 'stl_2' }]
      mockPrisma.vendorSettlement.findMany = jest.fn().mockResolvedValue(mockSettlements)

      const result = await listVendorSettlements()
      expect(result).toEqual(mockSettlements)
    })

    it('fetches settlements for a specific restaurant', async () => {
      mockPrisma.vendorSettlement.findMany = jest.fn().mockResolvedValue([])

      await listVendorSettlements('vnd_1')
      expect(mockPrisma.vendorSettlement.findMany).toHaveBeenCalledWith({
        where: { restaurant_id: 'vnd_1' },
        orderBy: { payout_date: 'desc' },
      })
    })
  })

  describe('createDriverPayout', () => {
    it('creates a driver payout', async () => {
      const payoutData = {
        id: 'payout_1',
        driver_id: 'rider_1',
        amount: 50,
        status: 'pending' as const,
      }
      mockPrisma.driverPayout.create = jest.fn().mockResolvedValue(payoutData)

      const result = await createDriverPayout(payoutData)
      expect(result).toEqual(payoutData)
    })
  })

  describe('listDriverPayouts', () => {
    it('fetches payouts for a driver', async () => {
      const mockPayouts = [{ id: 'payout_1', amount: 50 }]
      mockPrisma.driverPayout.findMany = jest.fn().mockResolvedValue(mockPayouts)

      const result = await listDriverPayouts('rider_1')
      expect(result).toEqual(mockPayouts)
      expect(mockPrisma.driverPayout.findMany).toHaveBeenCalledWith({
        where: { driver_id: 'rider_1' },
        orderBy: { created_at: 'desc' },
      })
    })
  })

  describe('listDriverIncentives', () => {
    it('fetches active incentives for a driver', async () => {
      const mockIncentives = [{ id: 'inc_1', title: 'Bonus' }]
      mockPrisma.driverIncentive.findMany = jest.fn().mockResolvedValue(mockIncentives)

      const result = await listDriverIncentives('rider_1')
      expect(result).toEqual(mockIncentives)
    })

    it('fetches all active incentives when no driverId', async () => {
      mockPrisma.driverIncentive.findMany = jest.fn().mockResolvedValue([])

      await listDriverIncentives()
      expect(mockPrisma.driverIncentive.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
      })
    })
  })
})
