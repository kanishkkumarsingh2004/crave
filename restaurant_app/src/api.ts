import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import {
  ApiError,
  COOKIE_SESSION_TOKEN,
  createApiClient,
  createPlatformTokenStore,
  createWebSocketUrl,
} from '@crave/mobile-core'
import { cacheApiResponse, clearMobileDataCache, readCachedApiResponse } from './mobileCache'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_restaurant_auth_token'
const CACHEABLE_GET_PREFIXES = ['/api/auth/me', '/api/restaurants', '/api/menu-items']

const client = createApiClient({
  appId: 'restaurant',
  apiOrigin: API_ORIGIN,
  isNative: () => Capacitor.isNativePlatform(),
  nativeRequest: (request) => CapacitorHttp.request(request),
  tokenStore: createPlatformTokenStore({
    key: TOKEN_KEY,
    isNative: () => Capacitor.isNativePlatform(),
    nativeStore: Preferences,
    browserStore: () => localStorage,
  }),
  cache: {
    shouldCache: ({ method, path, authenticated }) =>
      method === 'GET' &&
      authenticated &&
      CACHEABLE_GET_PREFIXES.some((prefix) => path.startsWith(prefix)),
    read: readCachedApiResponse,
    write: cacheApiResponse,
    clear: clearMobileDataCache,
  },
  timeouts: { connectMs: 15_000, readMs: 20_000 },
})

export { ApiError, COOKIE_SESSION_TOKEN }
export const apiRequest = client.request
export const restoreAuthToken = client.restoreAuthToken
export const saveAuthToken = client.saveAuthToken
export const clearAuthToken = client.clearAuthToken
export const getAuthToken = client.getAuthToken

export function getWebSocketUrl(): string {
  return createWebSocketUrl(API_ORIGIN, import.meta.env.VITE_WS_BASE_URL)
}
