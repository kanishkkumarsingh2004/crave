import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { cacheApiResponse, clearMobileDataCache, readCachedApiResponse } from './mobileCache'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_driver_auth_token'
export const COOKIE_SESSION_TOKEN = 'cookie-session'
const CACHEABLE_GET_PREFIXES = ['/api/auth/me', '/api/driver/profile', '/api/driver/upi']

let currentToken = ''

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function normalizeResponseData(value: unknown): any {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    return { message: value }
  }
}

export async function restoreAuthToken(): Promise<string> {
  if (currentToken) return currentToken
  if (Capacitor.isNativePlatform()) {
    currentToken = (await Preferences.get({ key: TOKEN_KEY })).value || ''
  } else {
    currentToken = localStorage.getItem(TOKEN_KEY) || ''
  }
  return currentToken
}

export async function saveAuthToken(token: string): Promise<void> {
  if (currentToken && currentToken !== token) await clearMobileDataCache()
  currentToken = token
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: TOKEN_KEY, value: token })
  } else {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export async function clearAuthToken(): Promise<void> {
  currentToken = ''
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: TOKEN_KEY })
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
  await clearMobileDataCache()
}

export function getAuthToken(): string {
  return currentToken
}

export function getApiOrigin(): string {
  return API_ORIGIN
}

export function getWebSocketUrl(token: string): string {
  const configured = import.meta.env.VITE_WS_BASE_URL?.trim()
  const base = configured || `${API_ORIGIN.replace(/^http/, 'ws')}/api/ws`
  const url = new URL(base)
  if (token && token !== COOKIE_SESSION_TOKEN) url.searchParams.set('token', token)
  return url.toString()
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET'
  const token = options.token ?? currentToken
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Crave-Native-App': 'driver',
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token && token !== COOKIE_SESSION_TOKEN ? { Authorization: `Bearer ${token}` } : {}),
  }

  let status: number
  let data: any
  // Offers, trips, orders, payouts, and GPS must always be live. Only stable
  // rider account data is eligible for offline fallback.
  const cacheable =
    Capacitor.isNativePlatform() &&
    method === 'GET' &&
    Boolean(token) &&
    CACHEABLE_GET_PREFIXES.some((prefix) => path.startsWith(prefix))

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url: `${API_ORIGIN}${path}`,
        method,
        headers,
        data: options.body,
        connectTimeout: 15000,
        readTimeout: 20000,
      })
      status = response.status
      data = normalizeResponseData(response.data)
    } else {
      const response = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      status = response.status
      data = normalizeResponseData(await response.text())
    }
  } catch (error) {
    const cached = cacheable ? await readCachedApiResponse<T>(path) : null
    if (cached !== null) return cached
    throw error
  }

  if (status < 200 || status >= 300) {
    if (cacheable && status >= 500) {
      const cached = await readCachedApiResponse<T>(path)
      if (cached !== null) return cached
    }
    throw new ApiError(data?.error || data?.message || 'Unable to complete the request.', status)
  }
  if (cacheable) await cacheApiResponse(path, data)
  else if (Capacitor.isNativePlatform() && method !== 'GET') await clearMobileDataCache()
  return data as T
}
