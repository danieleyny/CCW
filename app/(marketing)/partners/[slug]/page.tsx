import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { partnerBySlug, partnerFullName, partnerPath, publishedPartners } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { PartnerProfile } from "@/components/marketing/partner-profile"

/**
 * The general partner-profile route. Each partner also gets an explicit top-level
 * vanity route (/{slug}) plus a permanent redirect /partners/{slug} → /{slug}
 * (next.config), so a partner's canonical URL is its vanity URL and both spellings
 * resolve to one page. This route is the pattern's general renderer.
 */
export async function generateStaticParams() {
  return publishedPartners().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const partner = partnerBySlug(slug)
  if (!partner)
    return buildMetadata({
      title: "Attorney profile not available",
      description: "This attorney profile is not available.",
      path: `/partners/${slug}`,
      noIndex: true,
    })
  return buildMetadata({
    title: `${partnerFullName(partner)} — NYC Firearms Attorney`,
    description: partner.headline.slice(0, 155),
    // Canonical is the vanity URL, not this path.
    path: partnerPath(partner),
  })
}

export default async function PartnerProfileRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const partner = partnerBySlug(slug)
  if (!partner) notFound()
  return <PartnerProfile partner={partner} />
}
