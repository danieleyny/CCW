import "server-only"

import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActivePackages } from "@/lib/packages"
import { getFees, getFeeTable } from "@/lib/fees"
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
  instructors: "public-instructors",
} as const

/** A public instructor card — ONLY the opt-in projection, never base PII. */
export interface PublicInstructor {
  slug: string
  name: string
  boroughs: string[]
  languages: string[]
  classFormat: string | null
  bio: string | null
}

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

export const getPublicFeeTable = unstable_cache(
  async () => getFeeTable(createAdminClient()),
  ["public-fee-table"],
  { tags: [CACHE_TAGS.fees], revalidate: ONE_HOUR }
)

export const getPublicRegistry = unstable_cache(
  async () => getPreviewRegistry(createAdminClient()),
  ["public-registry"],
  { tags: [CACHE_TAGS.registry], revalidate: ONE_HOUR }
)

/**
 * The opt-in public instructor directory. Reads the `public_instructor_directory`
 * VIEW (never the base table) so the projection — enforced in SQL and proven by
 * tests/rls/instructor-public-directory — is the only thing that can ever reach
 * a marketing page. Cookieless service-role read → the page renders statically.
 */
export const getPublicInstructors = unstable_cache(
  async (): Promise<PublicInstructor[]> => {
    const { data } = await createAdminClient()
      .from("public_instructor_directory")
      .select("slug, name, boroughs, languages, class_format, bio")
      .order("name")
    return (data ?? []).map((r) => ({
      slug: r.slug ?? "",
      name: r.name ?? "",
      boroughs: r.boroughs ?? [],
      languages: r.languages ?? [],
      classFormat: r.class_format ?? null,
      bio: r.bio ?? null,
    }))
  },
  ["public-instructors"],
  { tags: [CACHE_TAGS.instructors], revalidate: ONE_HOUR }
)
