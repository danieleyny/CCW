import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { partnerBySlug, partnerFullName, partnerPath } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { PartnerProfile } from "@/components/marketing/partner-profile"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"

const SLUG = "ethanbrecher"

export function generateMetadata(): Metadata {
  const partner = partnerBySlug(SLUG)
  if (!partner)
    return buildMetadata({ title: "Attorney profile not available", description: "This attorney profile is not available.", path: `/${SLUG}`, noIndex: true })
  // coming_soon is never indexed; only a public partner is.
  const noIndex = partner.visibility !== "public"
  return buildMetadata({
    title: `${partnerFullName(partner)} — NYC Firearms Attorney`,
    description: partner.headline.slice(0, 155),
    // Canonical is the vanity URL; /partners/ethanbrecher 308-redirects here.
    path: `/${SLUG}`,
    noIndex,
  })
}

export default async function EthanBrecherPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const partner = partnerBySlug(SLUG)
  if (!partner) notFound()

  // A public partner never touches searchParams/cookies — stays statically rendered.
  if (partner.visibility === "public") {
    return <PartnerProfile partner={partner} />
  }

  // coming_soon: a ?preview=<code>/off link routes through the cookie-setting handler,
  // then lands back here clean.
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
