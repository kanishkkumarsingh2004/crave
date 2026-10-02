import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/admin", "/dashboard", "/dashboard/*", "/api/*", "/_next/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
