import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_restaurant_auth_token'

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
}

export function getAuthToken(): string {
  return currentToken
}

export function getWebSocketUrl(token: string): string {
  const configured = import.meta.env.VITE_WS_BASE_URL?.trim()
  const base = configured || `${API_ORIGIN.replace(/^http/, 'ws')}/api/ws`
  const url = new URL(base)
  url.searchParams.set('token', token)
  return url.toString()
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method || 'GET'
  const token = options.token ?? currentToken
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Crave-Native-App': 'restaurant',
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let status: number
  let data: any

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
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    status = response.status
    data = normalizeResponseData(await response.text())
  }

  if (status < 200 || status >= 300) {
    throw new ApiError(data?.error || data?.message || 'Unable to complete the request.', status)
  }
  return data as T
}
