import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { apiErrorMessage, normalizeApiPayload } from '../../lib/native/api-payload'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_customer_auth_token'
export const COOKIE_SESSION_TOKEN = 'cookie-session'
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
  if (currentToken && currentToken !== COOKIE_SESSION_TOKEN) {
    url.searchParams.set('token', currentToken)
  }
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
    ...(token && token !== COOKIE_SESSION_TOKEN ? { Authorization: `Bearer ${token}` } : {}),
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
    data = normalizeApiPayload(response.data)
  } else {
    const response = await fetch(path, {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    status = response.status
    data = normalizeApiPayload(await response.text())
  }
  if (status < 200 || status >= 300) throw new ApiError(apiErrorMessage(data, status, path), status)
  return data as T
}

/* ── Device cache ───────────────────────────────────────────────────────────
 * The last good answer for a read is kept on the device, so the app opens
 * instantly and still shows something when the network is gone. Writes are
 * never cached.
 */

const CACHE_PREFIX = 'crave_cache:'
const CACHE_LIMIT = 12

export interface CachedResult<T> {
  data: T
  /** True when the answer came from the device instead of the network. */
  fromCache: boolean
  /** When the cached copy was stored. */
  storedAt?: number
  /** How old the cached copy is, in milliseconds. */
  age?: number
  /** True when the copy is older than the caller asked for. */
  stale?: boolean
}

/**
 * The cache is scoped by the account, so a copy saved for one customer is
 * never shown to another who signs in on the same device.
 */
function cacheKey(path: string, scope?: string) {
  return `${CACHE_PREFIX}${scope ? `${scope}::` : ''}${path}`
}

function readCache<T>(path: string, scope?: string): { data: T; storedAt: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(path, scope))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.storedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(path: string, data: unknown, scope?: string) {
  try {
    localStorage.setItem(cacheKey(path, scope), JSON.stringify({ data, storedAt: Date.now() }))
    // Keep the cache small: drop the oldest entries once it grows.
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX))
    if (keys.length > CACHE_LIMIT) {
      const entries = keys
        .map((key) => {
          try {
            return { key, storedAt: JSON.parse(localStorage.getItem(key) || '{}').storedAt || 0 }
          } catch {
            return { key, storedAt: 0 }
          }
        })
        .sort((a, b) => a.storedAt - b.storedAt)
      for (const entry of entries.slice(0, entries.length - CACHE_LIMIT)) {
        localStorage.removeItem(entry.key)
      }
    }
  } catch {
    // A full or blocked storage must never break a request.
  }
}

/** Removes every cached read. */
export function clearApiCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

/**
 * A read that falls back to the device copy when the network fails.
 *
 * `maxAge` is how long a cached copy is served without a warning; past it the
 * app still shows the copy but flags it as stale.
 */
export async function cachedRequest<T>(
  path: string,
  options: { token?: string; maxAge?: number; scope?: string } = {}
): Promise<CachedResult<T>> {
  const maxAge = options.maxAge ?? 24 * 60 * 60 * 1000
  try {
    const data = await apiRequest<T>(path, { token: options.token })
    writeCache(path, data, options.scope)
    return { data, fromCache: false }
  } catch (error) {
    const cached = readCache<T>(path, options.scope)
    if (cached) {
      const age = Date.now() - cached.storedAt
      // An old copy is still better than an error, but the caller is told how
      // old it is so it can say so.
      return {
        data: cached.data,
        fromCache: true,
        storedAt: cached.storedAt,
        age,
        ...(age > maxAge ? { stale: true } : {}),
      }
    }
    throw error
  }
}
