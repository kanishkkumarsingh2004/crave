import { POST } from '@/app/api/user/change-password/route'
import { findUserById, updateUser } from '@/lib/dal'
import { verifyToken } from '@/lib/jwt'
import crypto from 'crypto'

jest.mock('@/lib/dal', () => ({
  findUserById: jest.fn(),
  updateUser: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn((name: string) => (name === 'crave_auth_token' ? { value: 'mock_token' } : null)),
  }),
}))

describe('/api/user/change-password API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns 401 if unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce(null)
    const req = new Request('http://localhost/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('returns 400 if validation fails (short password or mismatch)', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'usr_123' })
    const req = new Request('http://localhost/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpassword123',
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/at least 8 characters/i)
  })

  test('returns 400 if current password is incorrect', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'usr_123' })
    const salt = 'testsalt123'
    const correctHash = crypto.scryptSync('correctpassword', salt, 64).toString('hex')

    ;(findUserById as jest.Mock).mockResolvedValueOnce({
      id: 'usr_123',
      email: 'user@example.com',
      password_hash: `${salt}:${correctHash}`,
    })

    const req = new Request('http://localhost/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/current password you entered is incorrect/i)
  })

  test('successfully changes password and updates database', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ id: 'usr_123' })
    const salt = 'testsalt123'
    const currentHash = crypto.scryptSync('oldpassword123', salt, 64).toString('hex')

    ;(findUserById as jest.Mock).mockResolvedValueOnce({
      id: 'usr_123',
      email: 'user@example.com',
      password_hash: `${salt}:${currentHash}`,
    })
    ;(updateUser as jest.Mock).mockResolvedValueOnce({
      id: 'usr_123',
      email: 'user@example.com',
    })

    const req = new Request('http://localhost/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpassword123',
        newPassword: 'BrandNewSecurePassword2026!',
        confirmPassword: 'BrandNewSecurePassword2026!',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(updateUser).toHaveBeenCalledTimes(1)
    const [calledId, updatePayload] = (updateUser as jest.Mock).mock.calls[0]
    expect(calledId).toBe('usr_123')
    expect(updatePayload.password_hash).toBeDefined()
    expect(updatePayload.password_hash).toContain(':')
  })
})
