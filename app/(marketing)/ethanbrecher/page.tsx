import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { partnerBySlug, partnerFullName } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { PartnerProfile } from "@/components/marketing/partner-profile"

const SLUG = "ethanbrecher"

export function generateMetadata(): Metadata {
  const partner = partnerBySlug(SLUG)
  if (!partner)
    return buildMetadata({
      title: "Attorney profile not available",
      description: "This attorney profile is not available.",
      path: `/${SLUG}`,
      noIndex: true,
    })
  return buildMetadata({
    title: `${partnerFullName(partner)} — NYC Firearms Attorney`,
    description: partner.headline.slice(0, 155),
    // Force the canonical to the vanity URL; /partners/ethanbrecher 308-redirects here.
    path: `/${SLUG}`,
  })
}

/** Vanity route for the first partner. Renders from config; 404s while unpublished. */
export default function EthanBrecherPage() {
  const partner = partnerBySlug(SLUG)
  if (!partner) notFound()
  return <PartnerProfile partner={partner} />
}
