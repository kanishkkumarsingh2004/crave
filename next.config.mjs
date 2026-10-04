/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '10.247.209.229',
    '10.247.209.229:3000',
    '*.local',
  ],
  experimental: {
    serverOnlyExternalPackages: ['@prisma/adapter-pg', 'pg', 'pg-connection-string', 'pgpass'],
  },
}

export default nextConfig
