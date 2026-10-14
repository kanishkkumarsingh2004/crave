'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type UserRole =
  | 'user'
  | 'restaurant_vendor'
  | 'cravexp_store_vendor'
  | 'rider'
  | 'admin'
  | 'customer'
  | 'vendor'
  | 'driver'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  address?: string
  restaurantName?: string
  restaurantId?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
  vehicleNo?: string
  /** ISO 639-1 locale code — synced from DB on login, e.g. 'en' | 'kn' */
  locale?: string
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
  updateUser?: (data: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('crave_user')
        return saved ? JSON.parse(saved) : null
      } catch (e) {
        return null
      }
    }
    return null
  })

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('crave_token')
    }
    return null
  })

  const [isLoading, setIsLoading] = useState<boolean>(true)

  const syncClientCookies = (rawToken: string | null) => {
    if (typeof document === 'undefined') return
    if (!rawToken || rawToken === 'local-token') return
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const secureFlag = isHttps ? '; Secure' : ''
    const cookieVal = `${rawToken}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`
    document.cookie = `crave_auth_token=${cookieVal}`
    document.cookie = `drop_auth_token=${cookieVal}`
    document.cookie = `crave_token=${cookieVal}`
  }

  const clearClientCookies = () => {
    if (typeof document === 'undefined') return
    const names = ['crave_auth_token', 'drop_auth_token', 'crave_token']
    for (const name of names) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`
    }
  }

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        // If the URL has an explicit logout flag, purge local state and do not restore
        if (
          typeof window !== 'undefined' &&
          (window.location.search.includes('logout=') ||
            window.location.search.includes('signout='))
        ) {
          localStorage.removeItem('crave_user')
          localStorage.removeItem('crave_token')
          sessionStorage.clear()
          clearClientCookies()
          if (!cancelled) {
            setUser(null)
            setToken(null)
            setIsLoading(false)
          }
          return
        }

        const savedUserStr =
          typeof window !== 'undefined' ? localStorage.getItem('crave_user') : null
        const savedToken =
          typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null

        if (savedToken && savedToken !== 'local-token') {
          syncClientCookies(savedToken)
        }

        // Validate session with server using an AbortController with a 4500ms timeout
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4500)

          const headers: HeadersInit = {}
          if (savedToken && savedToken !== 'local-token') {
            headers['Authorization'] = `Bearer ${savedToken}`
          }
          const res = await fetch('/api/auth/me', {
            headers,
            signal: controller.signal,
            credentials: 'include',
          })
          clearTimeout(timeoutId)

          if (res.ok) {
            const data = await res.json()
            if (data.authenticated && data.user && !cancelled) {
              setUser(data.user)
              const activeToken = savedToken || 'cookie-session'
              setToken(activeToken)
              if (typeof window !== 'undefined') {
                localStorage.setItem('crave_user', JSON.stringify(data.user))
                if (savedToken) localStorage.setItem('crave_token', savedToken)
              }
              syncClientCookies(savedToken)
              setIsLoading(false)
              return
            }
          } else if (res.status === 401) {
            // Token rejected by server: clear local state to prevent broken redirect loops
            if (typeof window !== 'undefined') {
              localStorage.removeItem('crave_user')
              localStorage.removeItem('crave_token')
              sessionStorage.clear()
            }
            clearClientCookies()
            if (!cancelled) {
              setUser(null)
              setToken(null)
              setIsLoading(false)
            }
            return
          }
        } catch {
          // If network error, timeout, or offline, fall back gracefully to cached local storage
        }

        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr)
            if (parsed && parsed.id && !cancelled) {
              setUser(parsed)
              setToken(savedToken ?? 'local-token')
              if (savedToken) syncClientCookies(savedToken)
              setIsLoading(false)
              return
            }
          } catch (e) {
            console.warn('Stored session data was invalid, clearing it.')
            if (typeof window !== 'undefined') {
              localStorage.removeItem('crave_user')
              localStorage.removeItem('crave_token')
            }
            clearClientCookies()
          }
        }
      } catch (err) {
        console.error('Failed to restore local session:', err)
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
        setUser(result.user)
        setToken(result.token)
        if (typeof window !== 'undefined') {
          localStorage.setItem('crave_user', JSON.stringify(result.user))
          localStorage.setItem('crave_token', result.token ?? '')
        }
        if (result.token) {
          syncClientCookies(result.token)
        }
        setIsLoading(false)
        return result.user as UserProfile
      }
      const errMsg =
        result.error ||
        (response.status === 429
          ? 'Too many login attempts. Please wait a moment and try again.'
          : 'Email or password is incorrect.')
      throw new Error(errMsg)
    } catch (err) {
      console.error('Login error:', err)
      throw err
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
      if (result.user) {
        setUser(result.user)
        setToken(result.token ?? null)
        if (typeof window !== 'undefined') {
          localStorage.setItem('crave_user', JSON.stringify(result.user))
          localStorage.setItem('crave_token', result.token ?? '')
        }
        if (result.token) {
          syncClientCookies(result.token)
        }
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
      const activeToken =
        token || (typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null)

      if (typeof window !== 'undefined') {
        localStorage.removeItem('crave_user')
        localStorage.removeItem('crave_token')
        sessionStorage.clear()
      }
      clearClientCookies()

      // Notify server to revoke JWT in Redis/memory and purge HttpOnly cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken && activeToken !== 'local-token'
            ? { Authorization: `Bearer ${activeToken}` }
            : {}),
        },
        body: JSON.stringify({ token: activeToken }),
        credentials: 'include',
      }).catch(() => {})
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      if (typeof window !== 'undefined') {
        window.location.replace('/login?logout=1')
      }
    }
  }

  const updateUser = (data: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('crave_user', JSON.stringify(updated))
        } catch {}
      }
      return updated
    })
  }

  const role: UserRole = user?.role || 'user'

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
        updateUser,
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
