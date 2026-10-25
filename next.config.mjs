const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com ${isDevelopment ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://*.razorpay.com https://api.razorpay.com https://checkout.razorpay.com ${isDevelopment ? 'http: ws: wss: http://localhost:* ws://localhost:* wss://localhost:*' : ''} https://crave.apexonestudio.com wss://crave.apexonestudio.com;
  frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com;
  child-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com blob:;
  worker-src 'self' blob:;
  manifest-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://*.razorpay.com https://api.razorpay.com https://checkout.razorpay.com;
  frame-ancestors 'self';
  ${isProduction ? 'upgrade-insecure-requests;' : ''}
`
  .replace(/\s{2,}/g, ' ')
  .trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
    NEXT_PUBLIC_WS_HOST: process.env.WS_HOST || 'localhost',
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
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups', // Important for Razorpay
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig