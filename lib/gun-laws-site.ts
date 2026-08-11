import type { Metadata } from "next"
import { LAW_TOPICS } from "@/content/nyc-gun-laws"

/**
 * NYC GUN LAWS — site configuration.
 *
 * nycgunlaws.com is a satellite property that shares this deployment (see
 * proxy.ts for the host rewrite). It is deliberately NOT a second copy of
 * gunlicensenyc.com: the main site sells a licensing service, this one is a
 * plain-English reference to the law itself. Different content spine, different
 * query set, no doorway-page risk — which is the whole reason it can exist as
 * its own site instead of a 301. See DOMAIN_STRATEGY.md.
 *
 * Everything commercial (packages, fees, enrollment) is read from the same
 * database as the main site and hands off to it, so pricing can never drift.
 */
export const LAWS_SITE = {
  name: "NYC Gun Laws",
  shortName: "NYC Gun Laws",
  tagline: "The plain-English reference to New York City firearm law",
  origin: "https://nycgunlaws.com",
  mainSite: "https://gunlicensenyc.com",
  mainSiteLabel: "our main website",
  phone: "(929) 352-5961",
  phoneHref: "tel:+19293525961",
  email: "gunlicensenyc@gmail.com",
} as const

/** Static (non-topic) routes. Topic routes are derived from the content module. */
export const LAWS_STATIC_PATHS = [
  "",
  "/laws",
  "/getting-licensed",
  "/pricing",
  "/glossary",
  "/faq",
  "/sources",
] as const

export function lawsPaths(): string[] {
  return [...LAWS_STATIC_PATHS, ...LAW_TOPICS.map((t) => `/laws/${t.slug}`)]
}

export function lawsUrl(path = "") {
  return `${LAWS_SITE.origin}${path && path !== "/" ? path : ""}`
}

/** Absolute in-site href. Absolute (not relative) so the rewritten path tree never leaks. */
export const local = (path = "") => lawsUrl(path)

/** A link into the main website, with a consistent UTM so attribution is measurable. */
export function mainSiteUrl(path = "", medium = "referral") {
  const url = new URL(path || "/", LAWS_SITE.mainSite)
  url.searchParams.set("utm_source", "nycgunlaws.com")
  url.searchParams.set("utm_medium", medium)
  url.searchParams.set("utm_campaign", "satellite")
  return url.toString()
}

export function lawsMetadata({
  title,
  description,
  path = "",
  type = "website",
  publishedTime,
  modifiedTime,
}: {
  title: string
  description: string
  path?: string
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
}): Metadata {
  const url = lawsUrl(path)
  const og = `${LAWS_SITE.mainSite}/og?title=${encodeURIComponent(title)}`
  return {
    title,
    description,
    metadataBase: new URL(LAWS_SITE.origin),
    alternates: { canonical: url },
    openGraph: {
      type,
      title,
      description,
      url,
      siteName: LAWS_SITE.name,
      images: [{ url: og, width: 1200, height: 630 }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  }
}

/**
 * The shared entity graph. Deliberately mirrors lib/seo.ts's discipline on the
 * main site: one connected @id graph, publisher tied to the operating company,
 * and NO invented ratings, addresses, or review counts.
 */
export function lawsGraph(nodes: Record<string, unknown>[] = []) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${LAWS_SITE.origin}/#website`,
        url: LAWS_SITE.origin,
        name: LAWS_SITE.name,
        description: LAWS_SITE.tagline,
        inLanguage: "en-US",
        publisher: { "@id": `${LAWS_SITE.origin}/#publisher` },
      },
      {
        "@type": "Organization",
        "@id": `${LAWS_SITE.origin}/#publisher`,
        name: LAWS_SITE.name,
        url: LAWS_SITE.origin,
        email: LAWS_SITE.email,
        telephone: LAWS_SITE.phone,
        areaServed: { "@type": "City", name: "New York", sameAs: "https://en.wikipedia.org/wiki/New_York_City" },
        parentOrganization: { "@type": "Organization", name: "Gun License NYC", url: LAWS_SITE.mainSite },
        disambiguatingDescription:
          "An independent legal-information publication about New York City firearm law. Not a law firm, government agency, or NYPD affiliate.",
      },
      ...nodes,
    ],
  }
}

export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${lawsUrl(trail[trail.length - 1]?.path ?? "")}#breadcrumbs`,
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: lawsUrl(c.path),
    })),
  }
}

export function faqNode(id: string, faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": `${id}#faq`,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}
