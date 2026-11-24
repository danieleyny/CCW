import { gunLicenseNycBrand } from "@/config/gln-brand"

export const BRAND_KEYS = ["gln", "fl"] as const
export type BrandKey = (typeof BRAND_KEYS)[number]

export type BrandFeatures = {
  instructorMarketplace: boolean
  attorneyPartner: boolean
  trainingClasses: boolean
  conciergeSurfaces: boolean
  marketingEmails: boolean
}

export type BrandConfig = {
  name: string
  legalName: string
  tagline: string
  description: string
  domain: string
  url: string
  contact: { email: string; phone: string; address: string }
  logo: { wordmark: string; mark: string }
  disclaimer: string
  fonts: typeof gunLicenseNycBrand.fonts
  key: BrandKey
  displayName: string
  appOrigin: string
  marketingOrigin: string
  appHosts: readonly string[]
  supportEmail: string
  email: {
    fromEnv: "EMAIL_FROM" | "EMAIL_FROM_FL"
    replyTo: string
  }
  packages: readonly ("self_guided" | "full_concierge")[]
  payInFull: boolean
  stripeDescriptorSuffix?: string
  upgradeCreditMode: "credit_paid" | "none"
  features: BrandFeatures
  legalLinks: {
    privacy: string
    terms: string
    refunds: string
    disclaimer: string
  }
}

const trimOrigin = (value: string) => value.replace(/\/$/, "")

const flMarketingOrigin = trimOrigin(
  process.env.FL_MARKETING_ORIGIN?.trim() || "https://firearmlicensenyc.com"
)
const flAppOrigin = trimOrigin(
  process.env.FL_APP_ORIGIN?.trim() || "https://app.firearmlicensenyc.com"
)
const flSupportEmail = process.env.FL_SUPPORT_EMAIL?.trim() || ""
const glnLegalName = process.env.GLN_LEGAL_NAME?.trim() || gunLicenseNycBrand.legalName
const flLegalName = process.env.FL_LEGAL_NAME?.trim() || "Firearm Licensing NYC LLC"

const noFlFeatures: BrandFeatures = {
  instructorMarketplace: false,
  attorneyPartner: false,
  trainingClasses: false,
  conciergeSurfaces: false,
  marketingEmails: false,
}

export const BRANDS: Record<BrandKey, BrandConfig> = {
  gln: {
    ...gunLicenseNycBrand,
    key: "gln",
    displayName: gunLicenseNycBrand.name,
    legalName: glnLegalName,
    appOrigin: gunLicenseNycBrand.url,
    marketingOrigin: gunLicenseNycBrand.url,
    appHosts: [gunLicenseNycBrand.domain, `www.${gunLicenseNycBrand.domain}`, "ccw-eight.vercel.app"],
    supportEmail: gunLicenseNycBrand.contact.email,
    email: { fromEnv: "EMAIL_FROM", replyTo: gunLicenseNycBrand.contact.email },
    packages: ["full_concierge"],
    payInFull: false,
    upgradeCreditMode: "none",
    features: {
      instructorMarketplace: true,
      attorneyPartner: true,
      trainingClasses: true,
      conciergeSurfaces: true,
      marketingEmails: true,
    },
    legalLinks: {
      privacy: `${gunLicenseNycBrand.url}/privacy`,
      terms: `${gunLicenseNycBrand.url}/terms`,
      refunds: `${gunLicenseNycBrand.url}/terms#refunds`,
      disclaimer: `${gunLicenseNycBrand.url}/terms#disclaimer`,
    },
  },
  fl: {
    ...gunLicenseNycBrand,
    key: "fl",
    name: "Firearm License NYC",
    displayName: "Firearm License NYC",
    legalName: flLegalName,
    tagline: "A clear, self-guided NYC firearm-license application system.",
    description:
      "Self-guided software that helps New Yorkers organize and prepare their own NYC firearm-license application.",
    domain: "firearmlicensenyc.com",
    url: flMarketingOrigin,
    appOrigin: flAppOrigin,
    marketingOrigin: flMarketingOrigin,
    appHosts: ["app.firearmlicensenyc.com"],
    supportEmail: flSupportEmail,
    contact: {
      email: flSupportEmail,
      phone: "",
      address: "",
    },
    logo: {
      wordmark: "Firearm License NYC",
      mark: "✦",
    },
    email: { fromEnv: "EMAIL_FROM_FL", replyTo: flSupportEmail },
    packages: ["self_guided"],
    payInFull: true,
    stripeDescriptorSuffix: process.env.FL_STRIPE_DESCRIPTOR_SUFFIX?.trim() || undefined,
    upgradeCreditMode:
      process.env.FL_UPGRADE_CREDIT_MODE === "none" ? "none" : "credit_paid",
    features: noFlFeatures,
    legalLinks: {
      privacy: `${flMarketingOrigin}/privacy`,
      terms: `${flMarketingOrigin}/terms`,
      refunds: `${flMarketingOrigin}/refunds`,
      disclaimer: `${flMarketingOrigin}/disclaimer`,
    },
    disclaimer:
      "Firearm License NYC is self-guided software operated by Firearm Licensing NYC LLC. It is not a law firm and is not affiliated with or endorsed by the NYPD or any government agency. It does not represent applicants and cannot control NYPD timing or promise any outcome. You prepare and submit your own application.",
  },
}

export function isBrandKey(value: string | null | undefined): value is BrandKey {
  return value === "gln" || value === "fl"
}

export function flBrandEnabled(): boolean {
  return process.env.FL_BRAND_ENABLED === "true"
}

/**
 * Fail closed when someone tries to launch the FL host without the owner-owned
 * identity and delivery settings. With the flag off this intentionally does
 * nothing, so the foundation can ship without changing production behavior.
 */
export function assertBrandConfig(): void {
  if (!flBrandEnabled()) return

  const missing: string[] = []
  if (!process.env.GLN_LEGAL_NAME?.trim()) missing.push("GLN_LEGAL_NAME")
  if (!flSupportEmail) missing.push("FL_SUPPORT_EMAIL")
  if (!process.env.FL_STRIPE_DESCRIPTOR_SUFFIX?.trim()) missing.push("FL_STRIPE_DESCRIPTOR_SUFFIX")
  if (process.env.RESEND_API_KEY && !process.env.EMAIL_FROM_FL?.trim()) missing.push("EMAIL_FROM_FL")

  if (missing.length) {
    throw new Error(`FL_BRAND_ENABLED requires: ${missing.join(", ")}`)
  }
  if (!BRANDS.fl.email.replyTo.endsWith("@firearmlicensenyc.com")) {
    throw new Error("FL_SUPPORT_EMAIL must use the firearmlicensenyc.com domain")
  }
  if (
    process.env.EMAIL_FROM_FL &&
    !process.env.EMAIL_FROM_FL.toLowerCase().includes("@firearmlicensenyc.com")
  ) {
    throw new Error("EMAIL_FROM_FL must use the firearmlicensenyc.com domain")
  }
}

assertBrandConfig()
