/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'pg-connection-string', 'pgpass'],
  env: {
    NEXT_PUBLIC_WS_PORT: process.env.WS_PORT || '8000',
    NEXT_PUBLIC_WS_HOST: process.env.WS_HOST || '',
  },
}

export default nextConfig
