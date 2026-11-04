'use client'

import React, { createContext, useContext, useState } from 'react'
import type { UserRole, UserProfile } from '@/lib/contexts/auth-context'

const MockAuthContext = createContext<{
  user: UserProfile | null
  token: string | null
  role: UserRole
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserProfile | null>
  signup: (userData: Partial<UserProfile> & { role: UserRole; password: string }) => Promise<{
    success: boolean
    message?: string
    requiresEmailConfirmation?: boolean
  }>
  logout: () => Promise<void>
  updateUser?: (data: Partial<UserProfile>) => void
} | undefined>(undefined)

const defaultUser: UserProfile = {
  id: 'mock-user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'customer',
  phone: '+91 98765 43210',
  address: '123 Main St, Bengaluru 560001',
  restaurantName: 'Test Restaurant',
  restaurantId: 'rest_01',
  cuisine: 'Test Cuisine',
  vehicleType: 'EV Scooter',
  licensePlate: 'KA01AB1234',
  vehicleNo: 'KA01AB1234',
}

export function MockAuthProvider({ children, initialUser }: { 
  children: React.ReactNode
  initialUser?: Partial<UserProfile>
}) {
  const user = { ...defaultUser, ...initialUser }

  const value = {
    user,
    token: 'mock-token',
    role: user.role,
    isLoading: false,
    login: async () => user,
    signup: async () => ({ success: true, message: 'Success' }),
    logout: async () => {},
    updateUser: (data: Partial<UserProfile>) => {},
  }

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
}

// Export a hook that can be used in fixture components
export function useFixtureAuth() {
  const context = useContext(MockAuthContext)
  if (!context) {
    throw new Error('useFixtureAuth must be used within a MockAuthProvider')
  }
  return context
}