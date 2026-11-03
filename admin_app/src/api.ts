import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import {
  ApiError,
  COOKIE_SESSION_TOKEN,
  createMobileApiClient,
  createPathPrefixCachePolicy,
} from '@crave/mobile-core'
import { cacheApiResponse, clearMobileDataCache, readCachedApiResponse } from './mobileCache'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com').replace(
  /\/$/,
  ''
)
const TOKEN_KEY = 'crave_admin_auth_token'
const CACHEABLE_GET_PREFIXES = ['/api/auth/me', '/api/admin/cravexp-products']

const client = createMobileApiClient({
  appId: 'admin',
  apiOrigin: API_ORIGIN,
  isNative: () => Capacitor.isNativePlatform(),
  nativeRequest: (request) => CapacitorHttp.request(request),
  tokenKey: TOKEN_KEY,
  nativeStore: Preferences,
  browserStore: () => localStorage,
  cache: createPathPrefixCachePolicy(CACHEABLE_GET_PREFIXES, {
    read: readCachedApiResponse,
    write: cacheApiResponse,
    clear: clearMobileDataCache,
  }),
  timeouts: { connectMs: 15_000, readMs: 25_000 },
})

export { ApiError, COOKIE_SESSION_TOKEN }
export const apiRequest = client.request
export const restoreAuthToken = client.restoreAuthToken
export const saveAuthToken = client.saveAuthToken
export const clearAuthToken = client.clearAuthToken
export const getApiOrigin = client.getApiOrigin
