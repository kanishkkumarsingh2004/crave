import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  updateCustomerAddress,
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

  test('updateCustomerAddress updates existing address and respects ownership', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValueOnce({
      id: 'addr_1',
      customer_id: 'user_1',
      label: 'Home',
      address: '123 Main St',
      latitude: '12.9716',
      longitude: '77.5946',
      is_default: false,
    })
    mockPrisma.customerAddress.update.mockImplementationOnce((args: any) => ({
      id: 'addr_1',
      customer_id: 'user_1',
      label: args.data.label,
      address: args.data.address,
      latitude: args.data.latitude,
      longitude: args.data.longitude,
      is_default: args.data.is_default,
      created_at: new Date(),
    }))

    const updated = await updateCustomerAddress({
      id: 'addr_1',
      customer_id: 'user_1',
      label: 'Office',
      address: '999 Tech Park',
      latitude: 12.9352,
      longitude: 77.6245,
    })

    expect(updated).not.toBeNull()
    expect(updated?.label).toBe('Office')
    expect(updated?.address).toBe('999 Tech Park')
    expect(updated?.latitude).toBe(12.9352)
  })

  test('updateCustomerAddress returns null if not found or unauthorized', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValueOnce(null)

    const updated = await updateCustomerAddress({
      id: 'addr_other',
      customer_id: 'user_1',
      label: 'Office',
    })

    expect(updated).toBeNull()
  })

  test('setDefaultAddress sets default and unsets others', async () => {
    mockPrisma.customerAddress.findFirst.mockResolvedValueOnce({
      id: 'addr_1',
      customer_id: 'user_1',
      address: '123 Main St',
    })
    mockPrisma.customerAddress.updateMany.mockResolvedValueOnce({ count: 2 })
    mockPrisma.customerAddress.update.mockResolvedValueOnce({ id: 'addr_1', is_default: true })
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'user_1', address: '123 Main St' })

    const ok = await setDefaultAddress('addr_1', 'user_1')
    expect(ok).toBe(true)
    expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
      where: { customer_id: 'user_1' },
      data: { is_default: false },
    })
    expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
      where: { id: 'addr_1' },
      data: { is_default: true },
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

