/**
 * Presentation helpers for the PUBLIC instructor directory (no `server-only` so
 * both server pages and any client bit can share them). Pure formatting — no PII,
 * no data access.
 */

/** Human label for the `class_format` enum shown on public cards. */
export function classFormatLabel(format: string | null): string | null {
  switch (format) {
    case "private_1on1":
      return "Private one-on-one"
    case "small_group":
      return "Small-group classes"
    case "both":
      return "Private or small-group"
    default:
      return null
  }
}

/**
 * Emergency public-publishing exclusions are exact stable slugs, never names.
 *
 * The database opt-out remains the durable source of truth. This narrow guard
 * prevents a retired row from being republished by a stale cache or an
 * accidentally restored `public_profile` flag while the operational unpublish
 * is reviewed and applied.
 */
const RETIRED_PUBLIC_INSTRUCTOR_SLUGS = new Set([
  "partner22-6aa4d3bb",
])

export function isPublicInstructorSlugEligible(slug: string): boolean {
  return slug.length > 0 && !RETIRED_PUBLIC_INSTRUCTOR_SLUGS.has(slug)
}

export function retiredPublicInstructorExclusionCount(): number {
  return RETIRED_PUBLIC_INSTRUCTOR_SLUGS.size
}

export function filterEligiblePublicInstructors<T extends { slug: string }>(rows: T[]): T[] {
  return rows.filter((row) => isPublicInstructorSlugEligible(row.slug))
}
