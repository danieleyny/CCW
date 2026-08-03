import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { CANONICAL_ORIGIN } from "@/lib/seo"
import { MARKETING_ROUTES } from "@/lib/marketing-routes"
import { getPublicInstructors } from "@/lib/public-data"

/**
 * Sitemap. Always emitted against the CANONICAL origin (never the deploy host),
 * and derived entirely from the route registry (lib/marketing-routes) plus the
 * blog directory and the opt-in instructor profiles — so a page can't ship
 * without appearing here. `lastModified` is the honest per-route review date,
 * never build time.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = MARKETING_ROUTES.map((r) => ({
    url: `${CANONICAL_ORIGIN}${r.path}`,
    lastModified: new Date(r.lastReviewed),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const posts = getAllPosts().map((p) => ({
    url: `${CANONICAL_ORIGIN}/blog/${p.slug}`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  // Opt-in public instructor profiles (empty until instructors opt in).
  const instructors = (await getPublicInstructors()).map((i) => ({
    url: `${CANONICAL_ORIGIN}/instructors/${i.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }))

  return [...routes, ...posts, ...instructors]
}
