import { brand } from "@/config/brand"

/** Inline JSON-LD structured data. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: brand.name,
  description: brand.description,
  url: brand.url,
  email: brand.contact.email,
  telephone: brand.contact.phone,
  areaServed: "New York City",
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
}

export const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Concealed carry license assistance",
  provider: { "@type": "LocalBusiness", name: brand.name, url: brand.url },
  areaServed: { "@type": "City", name: "New York City" },
  description:
    "Concierge guidance through the NYC concealed-carry-weapon licensing process: training, document preparation, notarization, and NYPD filing.",
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
