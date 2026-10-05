import {
  findOrderById,
  listOrders,
  countOrders,
  createOrder,
  updateOrderStatus,
  updateOrder,
  getOrdersRevenue,
} from '@/lib/dal/orders'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

jest.mock('@/lib/prisma', () => require('../__mocks__/prisma'))

const mockPrisma = prisma as any

describe('Orders DAL', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('findOrderById', () => {
    it('returns order with customer and restaurant when found', async () => {
      const mockOrder = {
        id: 'ord_1',
        customer_name: 'Test Customer',
        customer: { id: 'usr_1', name: 'Customer' },
        restaurant: { id: 'vnd_1', name: 'Restaurant' },
      }
      mockPrisma.order.findUnique = jest.fn().mockResolvedValue(mockOrder)

      const result = await findOrderById('ord_1')
      expect(result).toEqual(mockOrder)
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        include: { customer: true, restaurant: true },
      })
    })

    it('returns null when order not found', async () => {
      mockPrisma.order.findUnique = jest.fn().mockResolvedValue(null)

      const result = await findOrderById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('listOrders', () => {
    it('fetches all orders without filters', async () => {
      const mockOrders = [{ id: 'ord_1' }, { id: 'ord_2' }]
      mockPrisma.order.findMany = jest.fn().mockResolvedValue(mockOrders)

      const result = await listOrders()
      expect(result).toEqual(mockOrders)
    })

    it('filters by customerId', async () => {
      mockPrisma.order.findMany = jest.fn().mockResolvedValue([])

      await listOrders({ customerId: 'usr_1' })
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customer_id: 'usr_1' } })
      )
    })

    it('filters by restaurantId', async () => {
      mockPrisma.order.findMany = jest.fn().mockResolvedValue([])

      await listOrders({ restaurantId: 'vnd_1' })
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurant_id: 'vnd_1' } })
      )
    })

    it('filters by status', async () => {
      mockPrisma.order.findMany = jest.fn().mockResolvedValue([])

      await listOrders({ status: 'preparing' as OrderStatus })
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'preparing' } })
      )
    })

    it('applies a limit when provided', async () => {
      mockPrisma.order.findMany = jest.fn().mockResolvedValue([])

      await listOrders({ limit: 10 })
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      )
    })
  })

  describe('countOrders', () => {
    it('counts orders for a customer', async () => {
      mockPrisma.order.count = jest.fn().mockResolvedValue(5)

      const count = await countOrders({ customerId: 'usr_1' })
      expect(count).toBe(5)
      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: { customer_id: 'usr_1' },
      })
    })

    it('counts orders for a restaurant', async () => {
      mockPrisma.order.count = jest.fn().mockResolvedValue(3)

      const count = await countOrders({ restaurantId: 'vnd_1' })
      expect(count).toBe(3)
    })
  })

  describe('createOrder', () => {
    it('creates an order with required fields', async () => {
      const orderData = {
        id: 'ord_new',
        customer_name: 'Test Customer',
        restaurant_name: 'Spice Garden',
        items: [{ name: 'Pizza', qty: 1, price: 150 }],
        subtotal: 150,
        total_amount: 168,
        status: 'payment_submitted' as OrderStatus,
      }
      const mockCreated = { ...orderData, customer_id: null }
      mockPrisma.order.create = jest.fn().mockResolvedValue(mockCreated)

      const result = await createOrder(orderData)
      expect(result).toEqual(mockCreated)
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'ord_new',
          customer_name: 'Test Customer',
        }),
      })
    })

    it('does not include utr_ref and customer_vpa in Prisma data', async () => {
      mockPrisma.order.create = jest.fn().mockResolvedValue({})

      await createOrder({
        id: 'ord_1',
        customer_name: 'Test',
        restaurant_name: 'Test',
        items: [],
        subtotal: 100,
        total_amount: 118,
        status: 'new' as OrderStatus,
        utr_ref: '123456789012',
        customer_vpa: 'test@upi',
      })

      const callArg = mockPrisma.order.create.mock.calls[0][0]
      expect(callArg.data).not.toHaveProperty('utr_ref')
      expect(callArg.data).not.toHaveProperty('customer_vpa')
    })
  })

  describe('updateOrderStatus', () => {
    it('updates order status and adds delivered_at when completed', async () => {
      mockPrisma.order.update = jest.fn().mockResolvedValue({ id: 'ord_1', status: 'completed' })

      const result = await updateOrderStatus('ord_1', 'completed')
      expect(result).toEqual({ id: 'ord_1', status: 'completed' })
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: expect.objectContaining({
          status: 'completed',
          delivered_at: expect.any(Date),
        }),
      })
    })

    it('updates order status without delivered_at for other statuses', async () => {
      mockPrisma.order.update = jest.fn().mockResolvedValue({ id: 'ord_1', status: 'preparing' })

      const result = await updateOrderStatus('ord_1', 'preparing')
      expect(result).toEqual({ id: 'ord_1', status: 'preparing' })
      const callArg = mockPrisma.order.update.mock.calls[0][0]
      expect(callArg.data).not.toHaveProperty('delivered_at')
    })
  })

  describe('updateOrder', () => {
    it('updates order with driver coordinates', async () => {
      const mockUpdated = { id: 'ord_1', driver_name: 'Rider A' }
      mockPrisma.order.update = jest.fn().mockResolvedValue(mockUpdated)

      const result = await updateOrder('ord_1', {
        status: 'out_for_delivery' as OrderStatus,
        driver_name: 'Rider A',
        driver_phone: '+919999999999',
        delivery_latitude: 12.9716,
        delivery_longitude: 77.5946,
      })

      expect(result).toEqual(mockUpdated)
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord_1' },
        data: {
          status: 'out_for_delivery',
          driver_name: 'Rider A',
          driver_phone: '+919999999999',
          delivery_latitude: 12.9716,
          delivery_longitude: 77.5946,
        },
      })
    })
  })

  describe('getOrdersRevenue', () => {
    it('calculates revenue from completed orders', async () => {
      const mockAggregate = {
        _sum: { total_amount: 10000, subtotal: 8000 },
        _count: 5,
      }
      mockPrisma.order.aggregate = jest.fn().mockResolvedValue(mockAggregate)

      const result = await getOrdersRevenue('vnd_1')
      expect(result).toEqual({
        totalRevenue: 10000,
        foodRevenue: 8000,
        orderCount: 5,
      })
    })
  })
})
