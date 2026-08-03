import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { CANONICAL_ORIGIN, canonical } from "@/lib/seo"
import { MARKETING_ROUTES } from "@/lib/marketing-routes"
import { getPublicInstructors } from "@/lib/public-data"
import { I18N_ES_ENABLED, TRANSLATED_PATHS } from "@/config/i18n"

/**
 * Sitemap. Always emitted against the CANONICAL origin (never the deploy host),
 * and derived entirely from the route registry (lib/marketing-routes) plus the
 * blog directory and the opt-in instructor profiles — so a page can't ship
 * without appearing here. `lastModified` is the honest per-route review date,
 * never build time.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // hreflang alternates for a translated English path ("" = home). Only emitted
  // when the Spanish surface is live.
  const altFor = (enPath: string) =>
    I18N_ES_ENABLED && (TRANSLATED_PATHS as readonly string[]).includes(enPath)
      ? {
          languages: {
            "en-US": canonical(enPath || "/"),
            es: canonical(`/es${enPath}`),
            "x-default": canonical(enPath || "/"),
          },
        }
      : undefined

  const routes = MARKETING_ROUTES.map((r) => {
    const alt = altFor(r.path)
    return {
      url: `${CANONICAL_ORIGIN}${r.path}`,
      lastModified: new Date(r.lastReviewed),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      ...(alt ? { alternates: alt } : {}),
    }
  })

  // The Spanish twins, each carrying the same alternates block.
  const esRoutes = I18N_ES_ENABLED
    ? (TRANSLATED_PATHS as readonly string[]).map((enPath) => ({
        url: `${CANONICAL_ORIGIN}/es${enPath}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        ...(altFor(enPath) ? { alternates: altFor(enPath)! } : {}),
      }))
    : []

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

  return [...routes, ...esRoutes, ...posts, ...instructors]
}
