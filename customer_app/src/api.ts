import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_customer_auth_token'
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

export async function restoreAuthToken() {
  if (currentToken) return currentToken
  currentToken = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: TOKEN_KEY })).value || ''
    : localStorage.getItem(TOKEN_KEY) || ''
  return currentToken
}
export async function saveAuthToken(token: string) {
  currentToken = token
  if (Capacitor.isNativePlatform()) await Preferences.set({ key: TOKEN_KEY, value: token })
  else localStorage.setItem(TOKEN_KEY, token)
}
export async function clearAuthToken() {
  currentToken = ''
  if (Capacitor.isNativePlatform()) await Preferences.remove({ key: TOKEN_KEY })
  else localStorage.removeItem(TOKEN_KEY)
}
export function getAuthToken() {
  return currentToken
}
export function getWebSocketUrl() {
  const base =
    import.meta.env.VITE_WS_BASE_URL?.trim() || `${API_ORIGIN.replace(/^http/, 'ws')}/api/ws`
  const url = new URL(base)
  url.searchParams.set('token', currentToken)
  return url.toString()
}
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const method = options.method || 'GET'
  const token = options.token ?? currentToken
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Crave-Native-App': 'customer',
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  let status = 0
  let data: any
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url: `${API_ORIGIN}${path}`,
      method,
      headers,
      data: options.body,
      connectTimeout: 15000,
      readTimeout: 25000,
    })
    status = response.status
    data = typeof response.data === 'string' ? JSON.parse(response.data || '{}') : response.data
  } else {
    const response = await fetch(path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    status = response.status
    const text = await response.text()
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }
  if (status < 200 || status >= 300)
    throw new ApiError(data?.error || data?.message || 'Something went wrong.', status)
  return data as T
}
