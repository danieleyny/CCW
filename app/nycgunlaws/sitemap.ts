import type { MetadataRoute } from "next"
import { lawsPaths, lawsUrl } from "@/lib/gun-laws-site"
import { LAWS_VERIFIED } from "@/content/nyc-gun-laws"

/**
 * Derived, not hand-maintained: the topic routes come straight from the content
 * module, so a new entry cannot be added without appearing in the sitemap. Fixes
 * the drift risk flagged against the main site's hand-kept ROUTES array.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(LAWS_VERIFIED)
  return lawsPaths().map((path) => ({
    url: lawsUrl(path),
    lastModified,
    changeFrequency: path === "" || path === "/laws" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/laws" || path.startsWith("/laws/") ? 0.9 : 0.7,
  }))
}
