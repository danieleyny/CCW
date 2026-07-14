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

/** V5b — the free anonymous checklist as a HowTo (high-intent SEO). */
export const checklistHowToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to prepare a NYC concealed carry license application",
  description:
    "The documents the NYPD License Division requires for a NYC concealed-carry (CCW) license — each tied to the rule it satisfies.",
  totalTime: "P6M",
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
