import "server-only"

import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActivePackages } from "@/lib/packages"
import { getFees, getFeeTable } from "@/lib/fees"
import { getPreviewRegistry } from "@/lib/requirements/preview"
import type { ServicePackage } from "@/lib/packages"
import type { Fees, FeeTableRow } from "@/lib/fees"
import type { RegistryItem } from "@/lib/requirements/preview"

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

/**
 * Secret-free fixture mode for the isolated visual-review deployment.
 *
 * This must remain server-only: unlike a public NEXT_PUBLIC_* flag, it cannot be
 * toggled in a visitor's browser. When enabled, marketing pages never construct
 * an admin client, so the redesign preview does not need — and must not receive —
 * a Supabase service-role key.
 */
const MARKETING_PREVIEW = process.env.MARKETING_PREVIEW_MODE === "1"

const PREVIEW_PACKAGES: ServicePackage[] = [
  {
    key: "self_guided",
    name: "Self-Guided",
    blurb: "Portal access, a complete document checklist, and guided preparation support.",
    priceCents: 49900,
    depositCents: 19900,
    priceLabel: "$499",
    featured: false,
    refilePromise: true,
  },
  {
    key: "full_concierge",
    name: "Full Concierge",
    blurb: "End-to-end coordination, document preparation, assembly, and interview preparation.",
    priceCents: 100000,
    depositCents: 50000,
    priceLabel: "$1,000",
    featured: true,
    refilePromise: true,
  },
  {
    key: "non_resident",
    name: "Non-Resident / Special Carry",
    blurb: "A dedicated track for applicants who live outside New York City.",
    priceCents: 0,
    depositCents: 0,
    priceLabel: "Custom",
    featured: false,
    refilePromise: false,
  },
  {
    key: "renewal",
    name: "Renewal",
    blurb: "A focused document-refresh and renewal-preparation service.",
    priceCents: 39900,
    depositCents: 0,
    priceLabel: "$399",
    featured: false,
    refilePromise: true,
  },
]

const PREVIEW_FEES: Fees = {
  applicationFee: "$340",
  fingerprintFee: "$88.25",
  combined: "$428.25",
  applicationCents: 34000,
  fingerprintCents: 8825,
}

const PREVIEW_FEE_TABLE: FeeTableRow[] = [
  {
    key: "nypd_application",
    label: "NYPD License Division application fee",
    amount: "$340",
    amountCents: 34000,
    payTo: "NYPD License Division",
    authority: "New York Penal Law §400.00(15)",
    notes: "Paid directly to the NYPD; non-refundable.",
    updatedAt: "2026-09-01",
  },
  {
    key: "dcjs_fingerprint",
    label: "Fingerprint fee",
    amount: "$88.25",
    amountCents: 8825,
    payTo: "NYPD License Division",
    authority: "NYPD License Division fee schedule",
    notes: "Confirm the amount when NYPD schedules the appointment; it can change.",
    updatedAt: "2026-09-01",
  },
]

const PREVIEW_REGISTRY: RegistryItem[] = [
  { reqCode: "ELG-01", title: "Applicant is 21 or older", authority: "P.L. §400.00(1)(a)", sourceUrl: null, severity: "critical", blocking: true, triggerCond: "always", jurisdiction: "nyc" },
  { reqCode: "TRN-01", title: "18-hour firearms safety training", authority: "P.L. §400.00(1)(o)", sourceUrl: null, severity: "long_lead", blocking: true, triggerCond: "carry_not_renewal", jurisdiction: "nyc" },
  { reqCode: "REF-01", title: "Four character references", authority: "38 RCNY §5-03", sourceUrl: null, severity: "high", blocking: true, triggerCond: "carry_not_renewal", jurisdiction: "nyc" },
  { reqCode: "COH-01", title: "Cohabitant affidavit for each adult", authority: "38 RCNY §5-03", sourceUrl: null, severity: "high", blocking: true, triggerCond: "if_cohabitants", jurisdiction: "nyc" },
  { reqCode: "IDN-01", title: "Government-issued photo ID", authority: "38 RCNY §5-03", sourceUrl: null, severity: "high", blocking: true, triggerCond: "always", jurisdiction: "nyc" },
  { reqCode: "RES-01", title: "Proof of residence", authority: "38 RCNY §5-02", sourceUrl: null, severity: "high", blocking: true, triggerCond: "always", jurisdiction: "nyc" },
  { reqCode: "DSC-01", title: "Complete and truthful disclosure questionnaire", authority: "P.L. §400.00(1)", sourceUrl: null, severity: "critical", blocking: true, triggerCond: "always", jurisdiction: "nyc" },
  { reqCode: "FEE-01", title: "Application and fingerprinting fees", authority: "P.L. §400.00(15)", sourceUrl: null, severity: "high", blocking: true, triggerCond: "always", jurisdiction: "nyc" },
  { reqCode: "FMT-01", title: "Upload format compliance", authority: "NYPD online application portal requirements", sourceUrl: null, severity: "watch", blocking: false, triggerCond: "always", jurisdiction: "nyc" },
]

const readPublicPackages = unstable_cache(
  async () => getActivePackages(createAdminClient()),
  ["public-packages"],
  { tags: [CACHE_TAGS.packages], revalidate: ONE_HOUR }
)

const readPublicFees = unstable_cache(
  async () => getFees(createAdminClient()),
  ["public-fees"],
  { tags: [CACHE_TAGS.fees], revalidate: ONE_HOUR }
)

const readPublicFeeTable = unstable_cache(
  async () => getFeeTable(createAdminClient()),
  ["public-fee-table"],
  { tags: [CACHE_TAGS.fees], revalidate: ONE_HOUR }
)

const readPublicRegistry = unstable_cache(
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
const readPublicInstructors = unstable_cache(
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

export async function getPublicPackages(): Promise<ServicePackage[]> {
  return MARKETING_PREVIEW ? PREVIEW_PACKAGES : readPublicPackages()
}

export async function getPublicFees(): Promise<Fees> {
  return MARKETING_PREVIEW ? PREVIEW_FEES : readPublicFees()
}

export async function getPublicFeeTable(): Promise<FeeTableRow[]> {
  return MARKETING_PREVIEW ? PREVIEW_FEE_TABLE : readPublicFeeTable()
}

export async function getPublicRegistry(): Promise<RegistryItem[]> {
  return MARKETING_PREVIEW ? PREVIEW_REGISTRY : readPublicRegistry()
}

export async function getPublicInstructors(): Promise<PublicInstructor[]> {
  return MARKETING_PREVIEW ? [] : readPublicInstructors()
}
