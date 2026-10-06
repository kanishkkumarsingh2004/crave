import { POST } from '@/app/api/admin/edit-account/route'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn().mockImplementation(async (token: string) => {
    if (token === 'valid-admin-token') {
      return { id: 'admin1', role: 'admin', email: 'admin@crave.com' }
    }
    return null
  }),
}))

jest.mock('@/lib/dal/users', () => ({
  updateUser: jest.fn().mockResolvedValue({ id: 'usr_1' }),
}))

jest.mock('@/lib/dal/restaurants', () => ({
  updateRestaurant: jest.fn().mockResolvedValue({ id: 'vnd_1' }),
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn(),
}))

import { updateUser } from '@/lib/dal/users'
import { updateRestaurant } from '@/lib/dal/restaurants'

describe('POST /api/admin/edit-account', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects unauthorized non-admin requests', async () => {
    const req = new Request('http://localhost/api/admin/edit-account', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer invalid-token' }),
      body: JSON.stringify({ id: 'usr_1', name: 'New Name' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('rejects missing account ID', async () => {
    const req = new Request('http://localhost/api/admin/edit-account', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer valid-admin-token' }),
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('successfully updates user account details', async () => {
    const req = new Request('http://localhost/api/admin/edit-account', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer valid-admin-token' }),
      body: JSON.stringify({
        id: 'usr_1',
        name: 'Updated Name',
        email: 'updated@crave.com',
        phone: '+91 99999 88888',
        storeName: 'Updated Kitchen',
        commissionRate: 20,
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(updateUser).toHaveBeenCalledWith(
      'usr_1',
      expect.objectContaining({ name: 'Updated Name' })
    )
    expect(updateRestaurant).toHaveBeenCalledWith(
      'usr_1',
      expect.objectContaining({ commission_rate: 20 })
    )
  })
})
