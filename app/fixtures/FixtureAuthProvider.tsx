'use client'

import React, { createContext, useContext, useState } from 'react'
import type { UserRole, UserProfile } from '@/lib/contexts/auth-context'

// Create a mock auth context that mimics the real one
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

export function FixtureAuthProvider({ children, userRole = 'customer' }: { children: React.ReactNode; userRole?: UserRole }) {
  const [user] = useState<UserProfile | null>({
    id: 'mock-user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: userRole,
    phone: '+91 98765 43210',
    address: '123 Main St, Bengaluru 560001',
    restaurantName: 'Test Restaurant',
    restaurantId: 'rest_01',
    cuisine: 'Test Cuisine',
    vehicleType: 'EV Scooter',
    licensePlate: 'KA01AB1234',
    vehicleNo: 'KA01AB1234',
  })

  const login = async () => user
  const signup = async () => ({ success: true, message: 'Success' })
  const logout = async () => {}
  const updateUser = (data: Partial<UserProfile>) => {}

  const value = {
    user,
    token: 'mock-token',
    role: userRole,
    isLoading: false,
    login,
    signup,
    logout,
    updateUser,
  }

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
}

// Hook for fixture components to access mock auth
export function useFixtureAuth() {
  const context = useContext(MockAuthContext)
  if (!context) {
    throw new Error('useFixtureAuth must be used within a FixtureAuthProvider')
  }
  return context
}