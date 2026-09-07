import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { partnerBySlug, partnerFullName, partnerPath, publishedPartners } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { PartnerProfile } from "@/components/marketing/partner-profile"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"

/**
 * The general partner-profile route. Each partner also gets an explicit top-level vanity
 * route (/{slug}) plus a permanent redirect /partners/{slug} → /{slug} (next.config), so
 * a partner's canonical URL is its vanity URL. Only PUBLIC partners are pre-rendered;
 * coming-soon ones render on demand behind the preview gate.
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
    return buildMetadata({ title: "Attorney profile not available", description: "This attorney profile is not available.", path: `/partners/${slug}`, noIndex: true })
  return buildMetadata({
    title: `${partnerFullName(partner)} — NYC Firearms Attorney`,
    description: partner.headline.slice(0, 155),
    path: partnerPath(partner), // canonical is the vanity URL
    noIndex: partner.visibility !== "public",
  })
}

export default async function PartnerProfileRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const partner = partnerBySlug(slug)
  if (!partner) notFound()

  if (partner.visibility === "public") {
    return <PartnerProfile partner={partner} />
  }

  const { preview } = await searchParams
  if (preview) {
    const to = encodeURIComponent(partnerPath(partner))
    redirect(preview === "off" ? `/partner-preview?to=${to}&off=1` : `/partner-preview?to=${to}&code=${encodeURIComponent(preview)}`)
  }

  if (await hasPreviewAccess()) {
    return (
      <>
        <PartnerProfile partner={partner} />
        <PartnerPreviewChip path={partnerPath(partner)} />
      </>
    )
  }
  return <PartnerComingSoon path={partnerPath(partner)} />
}
