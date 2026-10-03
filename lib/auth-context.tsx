'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type UserRole = 'customer' | 'vendor' | 'driver' | 'admin'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  address?: string
  restaurantName?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
}

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  role: UserRole
  isLoading: boolean
  login: (email: string, role?: UserRole) => Promise<boolean>
  loginAsRole: (role: UserRole) => Promise<void>
  signup: (userData: Partial<UserProfile> & { role: UserRole }) => Promise<void>
  logout: () => Promise<void>
  demoUsers: Record<UserRole, UserProfile>
}

const DEMO_USERS: Record<UserRole, UserProfile> = {
  customer: {
    id: 'usr_cust_1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    role: 'customer',
    phone: '+91 98765 43210',
    address: 'Indiranagar 100ft Rd, Bengaluru',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  vendor: {
    id: 'usr_vend_1',
    name: 'Maya Lin (Owner)',
    email: 'green@table.com',
    role: 'vendor',
    restaurantName: 'The Green Table',
    cuisine: 'Healthy Bowls & Salads',
    phone: '+91 98111 22334',
    address: 'Koramangala 5th Block, Bengaluru',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
  driver: {
    id: 'usr_driv_1',
    name: 'Rajesh Kumar',
    email: 'rajesh@express.com',
    role: 'driver',
    vehicleType: 'Electric Scooter (Ather 450X)',
    licensePlate: 'KA 01 EV 9821',
    phone: '+91 97444 55667',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  admin: {
    id: 'usr_admin_1',
    name: 'Sara Vance (Admin)',
    email: 'admin@crave.com',
    role: 'admin',
    phone: '+91 99000 00001',
    avatar:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  },
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('crave_auth_user')
      if (savedUser) {
        try {
          return JSON.parse(savedUser)
        } catch (e) {
          console.error('Failed to parse saved user:', e)
        }
      }
    }
    return DEMO_USERS.customer
  })

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('crave_jwt_token')
    }
    return null
  })

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function checkCurrentJWT() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            setUser(data.user)
            localStorage.setItem('crave_auth_user', JSON.stringify(data.user))
            const savedToken = localStorage.getItem('crave_jwt_token')
            if (savedToken) setToken(savedToken)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.error('Failed to verify JWT:', err)
      }

      // If token is invalid or missing, clear cached state
      setUser(null)
      setToken(null)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crave_jwt_token')
        localStorage.removeItem('crave_auth_user')
      }
      setIsLoading(false)
    }

    checkCurrentJWT()
  }, [])

  const login = async (email: string, requestedRole?: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: requestedRole }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('crave_jwt_token', data.token)
        localStorage.setItem('crave_auth_user', JSON.stringify(data.user))
        setIsLoading(false)
        return true
      }
    } catch (err) {
      console.error('Login error:', err)
    }
    return false
  }

  const loginAsRole = async (r: UserRole) => {
    const demoUser = DEMO_USERS[r]
    await login(demoUser.email, r)
  }

  const signup = async (userData: Partial<UserProfile> & { role: UserRole }) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem('crave_jwt_token', data.token)
        localStorage.setItem('crave_auth_user', JSON.stringify(data.user))
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Signup error:', err)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('crave_jwt_token')
    localStorage.removeItem('crave_auth_user')
    setIsLoading(false)
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const role: UserRole = user?.role || 'customer'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        loginAsRole,
        signup,
        logout,
        demoUsers: DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
