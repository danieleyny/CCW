/**
 * GA4 collection policy.
 *
 * Analytics is intentionally limited to the canonical public site and to pages
 * that describe the acquisition funnel. This keeps preview deployments, staff
 * work, applicant documents, opaque tokens, and case ids out of Google
 * Analytics while preserving the conversion steps that matter commercially.
 */

export type AnalyticsBrand = "gln" | "fl"

export const GLN_GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GLN_GA_MEASUREMENT_ID?.trim() || "G-VXS177VWT2"
export const FL_GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_FL_GA_MEASUREMENT_ID?.trim() || GLN_GA_MEASUREMENT_ID

const ANALYTICS_HOSTS: Record<AnalyticsBrand, ReadonlySet<string>> = {
  gln: new Set(["gunlicensenyc.com", "www.gunlicensenyc.com"]),
  // The Firearm License NYC marketing site is an independent deployment. This
  // project owns only the application subdomain.
  fl: new Set(["app.firearmlicensenyc.com"]),
}

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/instructor",
  "/r/",
  "/c/",
  "/invite/",
  "/sponsor",
  "/style-guide",
  "/visual-test",
  "/V1",
  "/V2",
  "/V3",
  "/V4",
] as const

/** Portal pages that are acquisition steps rather than ongoing client usage. */
const TRACKED_PORTAL_PATHS = new Set([
  "/portal",
  "/portal/choose-path",
  "/portal/enroll",
  "/portal/intake",
])

const SAFE_CAMPAIGN_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
])

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "")
}

export function analyticsBrandForHost(hostname: string): AnalyticsBrand | null {
  const host = normalizedHost(hostname)
  if (ANALYTICS_HOSTS.gln.has(host)) return "gln"
  if (ANALYTICS_HOSTS.fl.has(host)) return "fl"
  return null
}

export function isCanonicalAnalyticsHost(
  hostname: string,
  brand?: AnalyticsBrand
): boolean {
  const resolved = analyticsBrandForHost(hostname)
  return resolved !== null && (brand === undefined || resolved === brand)
}

export function analyticsMeasurementId(brand: AnalyticsBrand): string {
  return brand === "gln" ? GLN_GA_MEASUREMENT_ID : FL_GA_MEASUREMENT_ID
}

export function shouldTrackPath(pathname: string): boolean {
  if (PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return false
  }
  if (pathname === "/auth/login" || pathname.startsWith("/auth/callback")) return false
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return TRACKED_PORTAL_PATHS.has(pathname)
  }
  return true
}

export function shouldLoadAnalytics(
  hostname: string,
  pathname: string,
  brand?: AnalyticsBrand
): boolean {
  return isCanonicalAnalyticsHost(hostname, brand) && shouldTrackPath(pathname)
}

/** Low-cardinality grouping used by reports and explorations. */
export function analyticsPageGroup(pathname: string): string {
  if (pathname === "/") return "home"
  if (pathname === "/eligibility") return "eligibility"
  if (pathname === "/pricing") return "pricing"
  if (pathname === "/checklist") return "checklist"
  if (pathname === "/contact") return "contact"
  if (pathname.startsWith("/guides") || pathname.startsWith("/blog")) return "content"
  if (pathname.startsWith("/training")) return "training"
  if (pathname === "/auth/sign-up") return "sign_up"
  if (pathname.startsWith("/portal")) return "portal_onboarding"
  if (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/refunds" ||
    pathname === "/disclaimer"
  ) {
    return "legal"
  }
  return "marketing"
}

export function analyticsContext(
  hostname: string,
  pathname: string
): { brand: AnalyticsBrand; page_group: string } | null {
  const brand = analyticsBrandForHost(hostname)
  if (!brand || !shouldTrackPath(pathname)) return null
  return { brand, page_group: analyticsPageGroup(pathname) }
}

/**
 * Keep campaign attribution, but never send auth redirects, Stripe session ids,
 * access codes, reference tokens, or other arbitrary query values to GA.
 */
export function analyticsLocation(url: URL): string {
  const clean = new URL(url.origin + url.pathname)
  for (const [key, value] of url.searchParams) {
    if (SAFE_CAMPAIGN_PARAMS.has(key)) clean.searchParams.append(key, value)
  }
  return clean.toString()
}

export function isStripeReferrer(referrer: string): boolean {
  if (!referrer) return false
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    return host === "stripe.com" || host.endsWith(".stripe.com")
  } catch {
    return false
  }
}
