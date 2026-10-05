/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["*"],
  serverExternalPackages: ['@prisma/adapter-pg', 'pg', 'pg-connection-string', 'pgpass'],
  env: {
    NEXT_PUBLIC_WS_PORT: process.env.WS_PORT || '8000',
    NEXT_PUBLIC_WS_HOST: process.env.WS_HOST || 'localhost',
  },
}

export default nextConfig
