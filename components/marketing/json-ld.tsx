import { brand } from "@/config/brand"
import { CANONICAL_ORIGIN, canonical, ogImage } from "@/lib/seo"
import type { ServicePackage } from "@/lib/packages"

/** Inline JSON-LD structured data. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/**
 * Stable @id anchors. Everything else in the graph references these instead of
 * re-declaring the business, so search engines and AI models resolve ONE entity
 * rather than several look-alikes. (Before this, LocalBusiness and
 * Service.provider were two disconnected nodes describing the same company.)
 */
export const ID = {
  organization: `${CANONICAL_ORIGIN}/#organization`,
  website: `${CANONICAL_ORIGIN}/#website`,
  service: `${CANONICAL_ORIGIN}/#service`,
} as const

const LOGO = ogImage(brand.name)
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "The Bronx", "Staten Island"]

/**
 * The anchor entity. `sameAs` is INTENTIONALLY EMPTY: it must only ever contain
 * profiles we actually control, and inventing them would poison the entity.
 *
 * TODO — add each of these as it goes live, then redeploy:
 *   · Google Business Profile (highest value — also drives local pack + AI)
 *   · Instagram / Facebook / LinkedIn / X / YouTube
 * See SEO_OFFSITE_CHECKLIST.md.
 */
const SAME_AS: string[] = []

/**
 * ProfessionalService is a LocalBusiness subtype — one node serves as both the
 * Organization anchor and the local entity, which avoids duplicate-entity drift.
 * Only fields we can honestly assert: no street address (we're not a walk-in
 * storefront), no geo, no openingHours, no ratings.
 */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": ID.organization,
  name: brand.name,
  legalName: brand.legalName,
  description: brand.description,
  url: CANONICAL_ORIGIN,
  logo: { "@type": "ImageObject", url: LOGO, width: 1200, height: 630 },
  image: LOGO,
  email: brand.contact.email,
  telephone: brand.contact.phone,
  priceRange: "$$",
  ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "New York City" },
    ...BOROUGHS.map((name) => ({ "@type": "AdministrativeArea", name })),
  ],
  knowsAbout: [
    "NYC gun license application",
    "NYPD License Division process",
    "New York concealed carry licensing",
    "CCIA training requirements",
    "Premises and carry license types",
  ],
  disclaimer: brand.disclaimer,
}

/** Back-compat: the marketing layout imports this name. */
export const localBusinessSchema = organizationSchema

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": ID.website,
  url: CANONICAL_ORIGIN,
  name: brand.name,
  description: brand.description,
  publisher: { "@id": ID.organization },
  inLanguage: "en-US",
}

/**
 * The Service, with real offers. Prices come from the DB (service_packages) via
 * getActivePackages — never hardcoded — so a price change in admin moves the
 * structured data too. Pass [] and the offer catalog is simply omitted.
 *
 * Packages without a real fixed price are EXCLUDED rather than published at
 * zero: the Non-Resident / Special Carry tier is scoped case by case and carries
 * price_cents = 0 with a "Custom" price_label. Emitting `price: "0.00"` would
 * tell Google and AI models that tier is free, which is simply untrue.
 */
export function serviceSchemaWithOffers(packages: ServicePackage[] = []) {
  const priced = packages.filter((p) => p.priceCents > 0)
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": ID.service,
    serviceType: "Gun license application assistance",
    name: "NYC gun license concierge",
    description:
      "Guidance through the NYC gun-license process: eligibility, training, document preparation, notarization, and pre-filing review. The applicant files their own application.",
    provider: { "@id": ID.organization },
    areaServed: [
      { "@type": "City", name: "New York City" },
      ...BOROUGHS.map((name) => ({ "@type": "AdministrativeArea", name })),
    ],
    ...(priced.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Membership tiers",
            itemListElement: priced.map((p) => ({
              "@type": "Offer",
              name: p.name,
              description: p.blurb,
              price: (p.priceCents / 100).toFixed(2),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: canonical("/pricing"),
            })),
          },
        }
      : {}),
  }
}

/** Back-compat for any caller that wants the Service without offers. */
export const serviceSchema = serviceSchemaWithOffers()

/** BreadcrumbList — render on every non-home page. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  }
}

/** V5b — the free anonymous checklist as a HowTo (high-intent SEO). */
export const checklistHowToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to prepare a NYC gun license application",
  description:
    "The documents the NYPD License Division requires for a NYC gun license — each tied to the rule it satisfies.",
  totalTime: "P6M",
  provider: { "@id": ID.organization },
  step: [
    { "@type": "HowToStep", name: "Confirm eligibility", text: "Be 21+ and free of disqualifiers." },
    { "@type": "HowToStep", name: "Complete 18-hour training", text: "16 classroom + 2 live-fire hours with a DCJS-approved instructor." },
    { "@type": "HowToStep", name: "Gather documents", text: "References, cohabitant affidavits, proof of residence, photos, and disclosures." },
    { "@type": "HowToStep", name: "File and interview", text: "Submit to the NYPD, get fingerprinted, and attend the interview." },
  ],
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}
