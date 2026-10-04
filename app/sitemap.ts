import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crave.app'
const now = new Date()

const staticPages: MetadataRoute.Sitemap = [
  {
    url: baseUrl,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${baseUrl}/login`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${baseUrl}/signup`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${baseUrl}/user/explore`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${baseUrl}/user/cravexp`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${baseUrl}/user/orders`,
    lastModified: now,
    changeFrequency: 'never',
    priority: 0.6,
  },
  {
    url: `${baseUrl}/user/track`,
    lastModified: now,
    changeFrequency: 'never',
    priority: 0.6,
  },
  {
    url: `${baseUrl}/user/profile`,
    lastModified: now,
    changeFrequency: 'never',
    priority: 0.6,
  },
  {
    url: `${baseUrl}/vendor/menu`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/vendor/coupons`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/vendor/settings`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/driver/history`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/driver/incentives`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/driver/wallet`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${baseUrl}/policies`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${baseUrl}/policies/privacy`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${baseUrl}/policies/terms-of-service`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${baseUrl}/policies/cookies`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${baseUrl}/policies/security`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${baseUrl}/policies/fssai`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return staticPages
}

export { baseUrl }
