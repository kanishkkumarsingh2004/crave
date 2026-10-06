import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
} from '@/lib/dal/addresses'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => require('../__mocks__/prisma'))

const mockPrisma = prisma as any

describe('Addresses DAL', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getCustomerAddresses returns mapped customer addresses with coordinates', async () => {
    mockPrisma.customerAddress.findMany.mockResolvedValueOnce([
      {
        id: 'addr_1',
        customer_id: 'user_1',
        label: 'Home',
        address: '123 Main St, Tech City',
        is_default: true,
        latitude: '12.9716',
        longitude: '77.4695',
        created_at: new Date(),
      },
    ])

    const res = await getCustomerAddresses('user_1')
    expect(res).toHaveLength(1)
    expect(res[0]).toEqual({
      id: 'addr_1',
      customer_id: 'user_1',
      label: 'Home',
      address: '123 Main St, Tech City',
      is_default: true,
      latitude: 12.9716,
      longitude: 77.4695,
      created_at: expect.any(Date),
    })
    expect(mockPrisma.customerAddress.findMany).toHaveBeenCalledWith({
      where: { customer_id: 'user_1' },
      orderBy: { created_at: 'desc' },
    })
  })

  test('createCustomerAddress creates address and updates user address in DB', async () => {
    mockPrisma.customerAddress.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.customerAddress.create.mockImplementationOnce((args: any) => ({
      ...args.data,
      created_at: new Date(),
    }))
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'user_1', address: '456 Oak Rd' })

    const res = await createCustomerAddress({
      customer_id: 'user_1',
      label: 'Work',
      address: '456 Oak Rd',
      latitude: 12.6415,
      longitude: 77.4369,
      is_default: true,
    })

    expect(res.address).toBe('456 Oak Rd')
    expect(res.label).toBe('Work')
    expect(res.latitude).toBe(12.6415)
    expect(res.longitude).toBe(77.4369)
    expect(res.is_default).toBe(true)

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { address: '456 Oak Rd' },
    })
  })

  test('deleteCustomerAddress deletes address for customer', async () => {
    mockPrisma.customerAddress.deleteMany.mockResolvedValueOnce({ count: 1 })

    const success = await deleteCustomerAddress('addr_1', 'user_1')
    expect(success).toBe(true)
    expect(mockPrisma.customerAddress.deleteMany).toHaveBeenCalledWith({
      where: { id: 'addr_1', customer_id: 'user_1' },
    })
  })
})
