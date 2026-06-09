import type { MetadataRoute } from "next"
import { brand } from "@/config/brand"

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? brand.url

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/portal", "/auth", "/api", "/dashboard", "/style-guide"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
