import { POST } from '@/app/api/admin/create-driver/route'

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

jest.mock('@/lib/dal', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn().mockImplementation(async (data: any) => data),
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn(),
}))

import { createUser, findUserByEmail } from '@/lib/dal'

describe('POST /api/admin/create-driver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects non-admin requests', async () => {
    const req = new Request('http://localhost/api/admin/create-driver', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer invalid-token' }),
      body: JSON.stringify({ name: 'Rider', email: 'r@crave.com', password: 'pass' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('rejects missing required fields', async () => {
    const req = new Request('http://localhost/api/admin/create-driver', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer valid-admin-token' }),
      body: JSON.stringify({ name: 'Rider' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects duplicate email address', async () => {
    ;(findUserByEmail as jest.Mock).mockResolvedValueOnce({
      id: 'existing1',
      email: 'existing@crave.com',
      role: 'rider',
    })

    const req = new Request('http://localhost/api/admin/create-driver', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer valid-admin-token' }),
      body: JSON.stringify({ name: 'Rider', email: 'existing@crave.com', password: 'pass' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/already registered/)
  })

  it('successfully creates driver account', async () => {
    ;(findUserByEmail as jest.Mock).mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/admin/create-driver', {
      method: 'POST',
      headers: new Headers({ authorization: 'Bearer valid-admin-token' }),
      body: JSON.stringify({
        name: 'Ramesh Driver',
        email: 'ramesh@crave.com',
        password: 'Password123!',
        phone: '+91 98765 43210',
        vehicle_type: 'Electric Bike',
        license_plate: 'KA-05-EV-9999',
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.driver.name).toBe('Ramesh Driver')
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ramesh Driver',
        email: 'ramesh@crave.com',
        role: 'rider',
        vehicle_type: 'Electric Bike',
        license_plate: 'KA-05-EV-9999',
      })
    )
  })
})
