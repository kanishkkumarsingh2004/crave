import {
  findUserById,
  findUserByEmail,
  listUsersByRole,
  listAllUsers,
  createUser,
  updateUser,
  deleteUser,
  deleteUserByEmail,
} from '@/lib/dal/users'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => require('../__mocks__/prisma'))
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
          single: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
        }),
        ilike: () => ({
          maybeSingle: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
        }),
        order: () => ({
          then: async () => ({ data: [], error: { message: 'Supabase disabled' } }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase disabled' } }),
      }),
    }),
  },
}))

const mockPrisma = prisma as any

describe('Users DAL', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('findUserById', () => {
    it('returns user when found in Prisma', async () => {
      const mockUser = { id: 'usr_1', name: 'Test', email: 'test@test.com', role: 'user' }
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      const result = await findUserById('usr_1')
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'usr_1' } })
    })

    it('returns null when Prisma fails and Supabase fails', async () => {
      mockPrisma.user.findUnique = jest.fn().mockRejectedValue(new Error('DB error'))

      const result = await findUserById('usr_1')
      expect(result).toBeNull()
    })
  })

  describe('findUserByEmail', () => {
    it('normalizes email to lowercase before querying', async () => {
      const mockUser = { id: 'usr_1', email: 'test@test.com' }
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(mockUser)

      const result = await findUserByEmail('TEST@TEST.COM')
      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'test@test.com', mode: 'insensitive' } },
      })
    })
  })

  describe('listUsersByRole', () => {
    it('fetches users filtered by role from Prisma', async () => {
      const mockUsers = [{ id: 'usr_1', role: 'admin' }]
      mockPrisma.user.findMany = jest.fn().mockResolvedValue(mockUsers)

      const result = await listUsersByRole('admin')
      expect(result).toEqual(mockUsers)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin' },
        orderBy: { created_at: 'desc' },
      })
    })
  })

  describe('listAllUsers', () => {
    it('fetches all users ordered by created_at desc', async () => {
      const mockUsers = [
        { id: 'usr_1', name: 'A' },
        { id: 'usr_2', name: 'B' },
      ]
      mockPrisma.user.findMany = jest.fn().mockResolvedValue(mockUsers)

      const result = await listAllUsers()
      expect(result).toHaveLength(2)
    })
  })

  describe('createUser', () => {
    it('creates a new user with all fields', async () => {
      const userData = {
        id: 'usr_new',
        name: 'New User',
        email: 'new@test.com',
        role: 'user' as const,
        password_hash: 'hash123',
      }
      mockPrisma.user.create = jest.fn().mockResolvedValue(userData)

      const result = await createUser(userData)
      expect(result).toEqual(userData)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData })
    })

    it('throws on Prisma failure', async () => {
      mockPrisma.user.create = jest.fn().mockRejectedValue(new Error('Duplicate key'))

      await expect(
        createUser({
          id: 'usr_dup',
          name: 'Dupe',
          email: 'dupe@test.com',
          role: 'user',
        })
      ).rejects.toThrow('Unable to create user')
    })
  })

  describe('updateUser', () => {
    it('updates user data in Prisma', async () => {
      const mockUpdated = { id: 'usr_1', name: 'Updated Name' }
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUpdated)

      const result = await updateUser('usr_1', { name: 'Updated Name' })
      expect(result).toEqual(mockUpdated)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        data: { name: 'Updated Name' },
      })
    })
  })

  describe('deleteUser', () => {
    it('deletes user by ID', async () => {
      mockPrisma.user.delete = jest.fn().mockResolvedValue({ id: 'usr_1' })

      const result = await deleteUser('usr_1')
      expect(result).toEqual({ id: 'usr_1' })
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'usr_1' } })
    })
  })

  describe('deleteUserByEmail', () => {
    it('finds user by email and deletes them', async () => {
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue({ id: 'usr_by_email' })
      mockPrisma.user.delete = jest.fn().mockResolvedValue({ id: 'usr_by_email' })

      const result = await deleteUserByEmail('test@test.com')
      expect(result).toEqual({ id: 'usr_by_email' })
    })

    it('returns null when no user is found', async () => {
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null)

      const result = await deleteUserByEmail('notfound@test.com')
      expect(result).toBeNull()
    })
  })
})
