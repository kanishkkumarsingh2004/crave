import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@delivery/types",
    "@delivery/api-client",
    "@delivery/validation",
    "@delivery/constants",
    "@delivery/ui",
    "@delivery/config",
    "@delivery/database",
    "@delivery/utils",
    "@delivery/auth",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
