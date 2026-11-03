import { createCacheStorageAdapter } from '@crave/mobile-core'

const cache = createCacheStorageAdapter({ namespace: 'restaurant' })

export const readCachedApiResponse = cache.read
export const cacheApiResponse = cache.write
export const clearMobileDataCache = cache.clear
