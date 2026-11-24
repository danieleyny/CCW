/**
 * Stable Gun License NYC identity used to construct the multi-brand registry.
 * Keep this file dependency-free: `config/brand.ts` re-exports `BRANDS.gln`
 * for legacy callers, so importing the registry here would create a cycle.
 */
export const gunLicenseNycBrand = {
  name: "Gun License NYC",
  // NOTE: default entity name — the launch guard requires GLN_LEGAL_NAME when
  // the second brand is enabled so this placeholder cannot silently ship then.
  legalName: "Gun License NYC",
  tagline: "NYC gun licensing, handled with precision.",
  description:
    "Gun License NYC is a private licensing concierge that helps applicants organize the NYC handgun-license process — from the right application path through documents, review, and applicant-controlled submission.",
  domain: "gunlicensenyc.com",
  url: "https://gunlicensenyc.com",
  contact: {
    email: "gunlicensenyc@gmail.com",
    phone: "(929) 352-5961",
    address: "New York, NY",
  },
  logo: {
    wordmark: "Gun License NYC",
    mark: "◎",
  },
  disclaimer:
    "Gun License NYC is a private document-preparation and case-management service. We are not attorneys and do not represent you before the NYPD License Division; only a New York-licensed attorney may. We cannot expedite or guarantee any outcome, and we are not affiliated with or endorsed by the NYPD or any government agency. You review and submit your own application; we prepare and organize your filing materials. The NYPD retains full investigative discretion.",
  fonts: {
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    mono: "var(--font-mono)",
  },
} as const
