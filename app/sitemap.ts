import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { brand } from "@/config/brand"

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? brand.url

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/how-it-works",
    "/checklist",
    "/pricing",
    "/eligibility",
    "/faq",
    "/resources",
    "/contact",
    "/book",
    "/blog",
    "/privacy",
  ].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }))

  const posts = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...routes, ...posts]
}
