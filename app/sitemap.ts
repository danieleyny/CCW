import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { CANONICAL_ORIGIN } from "@/lib/seo"

/**
 * Sitemap. Always emitted against the CANONICAL origin (never the deploy host),
 * so a preview build can't advertise itself as the real site.
 *
 * `lastModified` is a hand-maintained review date per route rather than build
 * time: stamping `new Date()` on every deploy would claim every page changed
 * whenever anything shipped, which is both untrue and discounted by Google.
 * Update the date when a page's CONTENT actually changes.
 */
const REVIEWED = "2026-07-16"

type Entry = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; lastModified: string }

const ROUTES: Entry[] = [
  // The head term.
  { path: "", priority: 1.0, changeFrequency: "weekly", lastModified: REVIEWED },
  // High-intent / money pages — the queries that convert AND get quoted by AI.
  { path: "/cost", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/timeline", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/requirements", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/checklist", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/eligibility", priority: 0.8, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/do-i-need-a-lawyer", priority: 0.7, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/non-resident-business", priority: 0.7, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/renewal", priority: 0.7, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/denied-appeal", priority: 0.7, changeFrequency: "monthly", lastModified: REVIEWED },
  // Entity clarity — a top page for AI to cite.
  { path: "/about", priority: 0.7, changeFrequency: "monthly", lastModified: REVIEWED },
  // Borough / local intent.
  { path: "/gun-license/manhattan", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/gun-license/brooklyn", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/gun-license/queens", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/gun-license/bronx", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/gun-license/staten-island", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  // Supporting.
  { path: "/faq", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/resources", priority: 0.6, changeFrequency: "monthly", lastModified: REVIEWED },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly", lastModified: REVIEWED },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly", lastModified: REVIEWED },
  { path: "/book", priority: 0.6, changeFrequency: "yearly", lastModified: REVIEWED },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly", lastModified: REVIEWED },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ROUTES.map((r) => ({
    url: `${CANONICAL_ORIGIN}${r.path}`,
    lastModified: new Date(r.lastModified),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const posts = getAllPosts().map((p) => ({
    url: `${CANONICAL_ORIGIN}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...routes, ...posts]
}
