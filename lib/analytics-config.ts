/**
 * GA4 collection policy.
 *
 * Analytics is intentionally limited to the canonical public site and to pages
 * that describe the acquisition funnel. This keeps preview deployments, staff
 * work, applicant documents, opaque tokens, and case ids out of Google
 * Analytics while preserving the conversion steps that matter commercially.
 */

export const GA_MEASUREMENT_ID = "G-VXS177VWT2"
export const ANALYTICS_HOST = "gunlicensenyc.com"

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

export function isCanonicalAnalyticsHost(hostname: string): boolean {
  return hostname.toLowerCase().replace(/\.$/, "") === ANALYTICS_HOST
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

export function shouldLoadAnalytics(hostname: string, pathname: string): boolean {
  return isCanonicalAnalyticsHost(hostname) && shouldTrackPath(pathname)
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
