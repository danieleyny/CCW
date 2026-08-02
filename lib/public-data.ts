import "server-only"

import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { getPreviewRegistry } from "@/lib/requirements/preview"

/**
 * SEO/CWV — cached, COOKIELESS public data for the marketing pages.
 *
 * The problem: the home page and the /cost, /pricing, /requirements, /checklist,
 * /faq, /resources pillars all read live pricing/fees/registry. They did so via
 * the cookie-bound server client (`createClient()` → `cookies()`), which opts the
 * whole route OUT of the static cache — so every crawl and every visitor paid a
 * fresh Supabase round-trip and a slower TTFB on our most important pages.
 *
 * None of that data is per-user: service packages, government fees, and the
 * requirements registry are the same for everyone. So we read them with the
 * service-role client (no cookies → the route can render statically) and wrap
 * each read in `unstable_cache` with a tag + a 1-hour TTL. The pages become
 * static/ISR; the data still refreshes hourly, and anything that edits packages
 * or fees can call `revalidateTag(...)` for an instant bust (see the tag names).
 */

export const CACHE_TAGS = {
  packages: "public-packages",
  fees: "public-fees",
  registry: "public-registry",
} as const

const ONE_HOUR = 3600

export const getPublicPackages = unstable_cache(
  async () => getActivePackages(createAdminClient()),
  ["public-packages"],
  { tags: [CACHE_TAGS.packages], revalidate: ONE_HOUR }
)

export const getPublicFees = unstable_cache(
  async () => getFees(createAdminClient()),
  ["public-fees"],
  { tags: [CACHE_TAGS.fees], revalidate: ONE_HOUR }
)

export const getPublicRegistry = unstable_cache(
  async () => getPreviewRegistry(createAdminClient()),
  ["public-registry"],
  { tags: [CACHE_TAGS.registry], revalidate: ONE_HOUR }
)
