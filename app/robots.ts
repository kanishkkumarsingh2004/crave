import type { MetadataRoute } from 'next'

import { baseUrl } from './sitemap'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/signup',
          '/user/explore',
          '/user/cravexp',
          '/policies',
          '/policies/privacy',
          '/policies/terms-of-service',
          '/policies/cookies',
          '/policies/security',
          '/policies/fssai',
        ],
        disallow: [
          '/dashboard/',
          '/user/dashboard/',
          '/user/orders/',
          '/user/track/',
          '/user/profile/',
          '/vendor/',
          '/driver/',
          '/admin/',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/login',
          '/signup',
          '/user/explore',
          '/user/cravexp',
          '/policies',
          '/policies/privacy',
          '/policies/terms-of-service',
          '/policies/cookies',
          '/policies/security',
          '/policies/fssai',
        ],
        disallow: [
          '/dashboard/',
          '/user/dashboard/',
          '/user/orders/',
          '/user/track/',
          '/user/profile/',
          '/vendor/',
          '/driver/',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
