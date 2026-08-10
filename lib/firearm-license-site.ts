import type { Metadata } from "next"

export const FIREARM_SITE = {
  name: "Firearm License NYC",
  origin: "https://firearmlicensenyc.com",
  mainSite: "https://gunlicensenyc.com",
  phone: "(929) 352-5961",
  email: "gunlicensenyc@gmail.com",
} as const

export const FIREARM_PATHS = [
  "",
  "/process",
  "/requirements",
  "/pricing",
  "/faq",
  "/boroughs/manhattan",
  "/boroughs/brooklyn",
  "/boroughs/queens",
  "/boroughs/bronx",
  "/boroughs/staten-island",
] as const

export function firearmUrl(path = "") {
  return `${FIREARM_SITE.origin}${path && path !== "/" ? path : ""}`
}

export function firearmMetadata({
  title,
  description,
  path = "",
}: {
  title: string
  description: string
  path?: string
}): Metadata {
  const url = firearmUrl(path)
  return {
    // Absolute prevents the main website's root title template from appending
    // its brand to this independent domain.
    title: { absolute: title },
    description,
    metadataBase: new URL(FIREARM_SITE.origin),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: FIREARM_SITE.name,
      images: [{ url: `${FIREARM_SITE.mainSite}/og?title=${encodeURIComponent(title)}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${FIREARM_SITE.mainSite}/og?title=${encodeURIComponent(title)}`],
    },
  }
}
