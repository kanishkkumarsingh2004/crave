import { GET, POST, PUT, DELETE } from '@/app/api/user/addresses/route'
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  updateCustomerAddress,
} from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'

jest.mock('@/lib/dal', () => ({
  getCustomerAddresses: jest.fn(),
  createCustomerAddress: jest.fn(),
  deleteCustomerAddress: jest.fn(),
  updateCustomerAddress: jest.fn(),
  setDefaultAddress: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn((name: string) => (name === 'crave_auth_token' ? { value: 'mock_token' } : null)),
  }),
}))

describe('/api/user/addresses API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('GET returns 401 if unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce(null)
    const req = new Request('http://localhost/api/user/addresses')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  test('GET returns user addresses when authenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'user_123' })
    ;(getCustomerAddresses as jest.Mock).mockResolvedValueOnce([
      {
        id: 'addr_1',
        customer_id: 'user_123',
        label: 'Home',
        address: '123 Main St',
        is_default: true,
        latitude: 12.6415,
        longitude: 77.4369,
      },
    ])

    const req = new Request('http://localhost/api/user/addresses', {
      headers: { Authorization: 'Bearer mock_token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.addresses).toHaveLength(1)
    expect(json.addresses[0].latitude).toBe(12.6415)
    expect(json.addresses[0].longitude).toBe(77.4369)
  })

  test('POST creates address with coordinates', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'user_123' })
    ;(createCustomerAddress as jest.Mock).mockResolvedValueOnce({
      id: 'addr_2',
      customer_id: 'user_123',
      label: 'Work',
      address: '456 Business Park',
      is_default: true,
      latitude: 12.9716,
      longitude: 77.4695,
    })

    const req = new Request('http://localhost/api/user/addresses', {
      method: 'POST',
      headers: { Authorization: 'Bearer mock_token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'Work',
        address: '456 Business Park',
        latitude: 12.9716,
        longitude: 77.4695,
        is_default: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.address.latitude).toBe(12.9716)
    expect(json.address.longitude).toBe(77.4695)
    expect(createCustomerAddress).toHaveBeenCalledWith({
      customer_id: 'user_123',
      label: 'Work',
      address: '456 Business Park',
      latitude: 12.9716,
      longitude: 77.4695,
      is_default: true,
    })
  })

  test('PUT updates an address for authorized customer', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'user_123' })
    ;(updateCustomerAddress as jest.Mock).mockResolvedValueOnce({
      id: 'addr_2',
      customer_id: 'user_123',
      label: 'Office',
      address: 'Updated 456 Business Park',
      latitude: 12.9716,
      longitude: 77.4695,
      is_default: false,
    })

    const req = new Request('http://localhost/api/user/addresses', {
      method: 'PUT',
      headers: { Authorization: 'Bearer mock_token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'addr_2',
        label: 'Office',
        address: 'Updated 456 Business Park',
      }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.address.label).toBe('Office')
    expect(updateCustomerAddress).toHaveBeenCalledWith({
      id: 'addr_2',
      customer_id: 'user_123',
      label: 'Office',
      address: 'Updated 456 Business Park',
      latitude: undefined,
      longitude: undefined,
      is_default: undefined,
    })
  })

  test('PUT sets default address when action is set_default', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'user_123' })
    ;(setDefaultAddress as jest.Mock).mockResolvedValueOnce(true)

    const req = new Request('http://localhost/api/user/addresses', {
      method: 'PUT',
      headers: { Authorization: 'Bearer mock_token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'addr_2',
        action: 'set_default',
      }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(setDefaultAddress).toHaveBeenCalledWith('addr_2', 'user_123')
  })

  test('DELETE removes address by ID', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'user_123' })
    ;(deleteCustomerAddress as jest.Mock).mockResolvedValueOnce(true)

    const req = new Request('http://localhost/api/user/addresses?id=addr_2', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer mock_token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(deleteCustomerAddress).toHaveBeenCalledWith('addr_2', 'user_123')
  })
})

