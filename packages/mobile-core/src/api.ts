import { createAccountCacheKey } from './cache'

export type AppId = 'customer' | 'driver' | 'restaurant' | 'admin'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const COOKIE_SESSION_TOKEN = 'cookie-session'
export const HTML_PAYLOAD_MESSAGE = 'The server returned a web page instead of data.'

const HTML_PAYLOAD_PATTERN = /^\s*(<!doctype\s+html|<html[\s>]|<\?xml)/i
const MAX_ERROR_LENGTH = 240

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isHtmlPayload(value: string): boolean {
  return HTML_PAYLOAD_PATTERN.test(value.replace(/^\uFEFF/, ''))
}

export function normalizeApiPayload(value: unknown): any {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    if (isHtmlPayload(value)) return { error: HTML_PAYLOAD_MESSAGE }
    return { message: value }
  }
}

export function apiErrorMessage(data: any, status: number, path: string): string {
  const raw = data?.error || data?.message
  const text =
    typeof raw === 'string' && raw.trim() ? raw.trim() : 'Unable to complete the request.'
  const message =
    status === 404 && text === HTML_PAYLOAD_MESSAGE
      ? `${text} The endpoint ${path} is missing on the deployed backend — deploy the latest server build and try again.`
      : text
  return message.length > MAX_ERROR_LENGTH
    ? `${message.slice(0, MAX_ERROR_LENGTH - 1).trimEnd()}…`
    : message
}

export interface TokenStore {
  get(): Promise<string>
  set(token: string): Promise<void>
  clear(): Promise<void>
}

export interface NativeKeyValueStore {
  get(options: { key: string }): Promise<{ value: string | null }>
  set(options: { key: string; value: string }): Promise<void>
  remove(options: { key: string }): Promise<void>
}

export interface BrowserKeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createPlatformTokenStore(options: {
  key: string
  isNative: () => boolean
  nativeStore: NativeKeyValueStore
  browserStore: () => BrowserKeyValueStore
}): TokenStore {
  return {
    async get() {
      return options.isNative()
        ? (await options.nativeStore.get({ key: options.key })).value || ''
        : options.browserStore().getItem(options.key) || ''
    },
    async set(token) {
      if (options.isNative()) {
        await options.nativeStore.set({ key: options.key, value: token })
      } else {
        options.browserStore().setItem(options.key, token)
      }
    },
    async clear() {
      if (options.isNative()) {
        await options.nativeStore.remove({ key: options.key })
      } else {
        options.browserStore().removeItem(options.key)
      }
    },
  }
}

export interface ApiCachePolicy {
  shouldCache(input: { method: HttpMethod; path: string; authenticated: boolean }): boolean
  read<T>(key: string): Promise<T | null>
  write(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

export interface ApiCacheStorage {
  read<T>(key: string): Promise<T | null>
  write(key: string, value: unknown): Promise<void>
  clear(): Promise<void>
}

export function createPathPrefixCachePolicy(
  prefixes: readonly string[],
  storage: ApiCacheStorage
): ApiCachePolicy {
  return {
    shouldCache: ({ method, path, authenticated }) =>
      method === 'GET' && authenticated && prefixes.some((prefix) => path.startsWith(prefix)),
    ...storage,
  }
}

export interface NativeHttpRequest {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  data?: unknown
  connectTimeout: number
  readTimeout: number
}

export interface NativeHttpResponse {
  status: number
  data: unknown
}

export interface ApiClientConfig {
  appId: AppId
  apiOrigin: string
  tokenStore: TokenStore
  isNative: () => boolean
  nativeRequest: (request: NativeHttpRequest) => Promise<NativeHttpResponse>
  browserFetch?: typeof fetch
  cache?: ApiCachePolicy
  timeouts: {
    connectMs: number
    readMs: number
  }
}

export interface MobileApiClientConfig extends Omit<ApiClientConfig, 'tokenStore'> {
  tokenKey: string
  nativeStore: NativeKeyValueStore
  browserStore: () => BrowserKeyValueStore
}

export interface ApiRequestOptions {
  /** Kept broad for compatibility with existing app-level request wrappers. */
  method?: string
  body?: unknown
  token?: string
}

export interface ApiClient {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>
  restoreAuthToken(): Promise<string>
  saveAuthToken(token: string): Promise<void>
  clearAuthToken(): Promise<void>
  getAuthToken(): string
  getApiOrigin(): string
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const apiOrigin = config.apiOrigin.replace(/\/$/, '')
  let currentToken = ''

  async function restoreAuthToken(): Promise<string> {
    if (!currentToken) currentToken = await config.tokenStore.get()
    return currentToken
  }

  async function saveAuthToken(token: string): Promise<void> {
    if (currentToken && currentToken !== token) await config.cache?.clear()
    currentToken = token
    await config.tokenStore.set(token)
  }

  async function clearAuthToken(): Promise<void> {
    currentToken = ''
    await config.tokenStore.clear()
    await config.cache?.clear()
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase() as HttpMethod
    const token = options.token ?? currentToken
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Crave-Native-App': config.appId,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token && token !== COOKIE_SESSION_TOKEN ? { Authorization: `Bearer ${token}` } : {}),
    }
    const native = config.isNative()
    const cacheable =
      native &&
      Boolean(config.cache) &&
      config.cache!.shouldCache({ method, path, authenticated: Boolean(token) })
    const cacheKey = cacheable ? await createAccountCacheKey(path, token) : path

    let status: number
    let data: any
    try {
      if (native) {
        const response = await config.nativeRequest({
          url: `${apiOrigin}${path}`,
          method,
          headers,
          data: options.body,
          connectTimeout: config.timeouts.connectMs,
          readTimeout: config.timeouts.readMs,
        })
        status = response.status
        data = normalizeApiPayload(response.data)
      } else {
        const response = await (config.browserFetch || fetch)(path, {
          method,
          headers,
          credentials: 'include',
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        })
        status = response.status
        data = normalizeApiPayload(await response.text())
      }
    } catch (error) {
      const cached = cacheable ? await config.cache!.read<T>(cacheKey) : null
      if (cached !== null) return cached
      throw error
    }

    if (status < 200 || status >= 300) {
      if (cacheable && status >= 500) {
        const cached = await config.cache!.read<T>(cacheKey)
        if (cached !== null) return cached
      }
      throw new ApiError(apiErrorMessage(data, status, path), status)
    }

    if (cacheable) await config.cache!.write(cacheKey, data)
    else if (native && method !== 'GET') await config.cache?.clear()
    return data as T
  }

  return {
    request,
    restoreAuthToken,
    saveAuthToken,
    clearAuthToken,
    getAuthToken: () => currentToken,
    getApiOrigin: () => apiOrigin,
  }
}

export function createMobileApiClient(config: MobileApiClientConfig): ApiClient {
  const { tokenKey, nativeStore, browserStore, ...clientConfig } = config
  return createApiClient({
    ...clientConfig,
    tokenStore: createPlatformTokenStore({
      key: tokenKey,
      isNative: config.isNative,
      nativeStore,
      browserStore,
    }),
  })
}

export function createWebSocketUrl(apiOrigin: string, configured?: string): string {
  const base = configured?.trim() || `${apiOrigin.replace(/\/$/, '').replace(/^http/, 'ws')}/api/ws`
  return new URL(base).toString()
}
