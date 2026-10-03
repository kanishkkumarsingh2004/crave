'use client'

import { supabase } from '@/lib/supabase'
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
  vehicleNo?: string
}

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    async function restoreSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        if (accessToken) {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          const result = await response.json()
          if (response.ok && result.success && result.user && !cancelled) {
            setUser(result.user)
            setToken(result.token)
            return
          }
          await supabase.auth.signOut()
        }
      } catch (err) {
        console.error('Failed to restore Supabase session:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const text = await response.text()
      let result: any = {}
      try {
        result = text ? JSON.parse(text) : {}
      } catch {
        result = {}
      }

      if (response.ok && result.success && result.user) {
        if (result.session) {
          const { error } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
          })
          if (error) console.warn('Supabase setSession notice:', error.message)
        }
        setUser(result.user)
        setToken(result.token)
        setIsLoading(false)
        return result.user as UserProfile
      }
      return null
    } catch (err) {
      console.error('Login error:', err)
      return null
    }
  }

  const signup = async (userData: Partial<UserProfile> & { role: UserRole; password: string }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, message: result.error || 'Unable to create account.' }
      }
      if (result.session) {
        const { error } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })
        if (error) throw error
      }
      if (result.user) {
        setUser(result.user)
        setToken(result.token ?? null)
      }
      return {
        success: true,
        message: result.message,
        requiresEmailConfirmation: Boolean(result.requiresEmailConfirmation),
      }
    } catch (err) {
      console.error('Signup error:', err)
      return { success: false, message: 'Unable to create account.' }
    }
  }

  const logout = async () => {
    try {
      await Promise.all([supabase.auth.signOut(), fetch('/api/auth/logout', { method: 'POST' })])
    } catch (err) {
      console.error('Logout error:', err)
    }
    setUser(null)
    setToken(null)
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
        signup,
        logout,
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
