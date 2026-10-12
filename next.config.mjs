/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'pg-connection-string', 'pgpass'],
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  env: {
    NEXT_PUBLIC_WS_PORT: process.env.WS_PORT || '8000',
    NEXT_PUBLIC_WS_HOST: process.env.WS_HOST || '',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

export default nextConfig
