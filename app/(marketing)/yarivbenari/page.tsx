import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { buildMetadata } from "@/lib/seo"
import { trainingPartnerBySlug, trainingPartnerPath } from "@/config/training-partners"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { TrainingPartnerProfile } from "@/components/marketing/training-partner-profile"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"

const SLUG = "yarivbenari"

export function generateMetadata(): Metadata {
  const partner = trainingPartnerBySlug(SLUG)
  if (!partner) return buildMetadata({ title: "Training profile not available", description: "This training profile is not available.", path: `/${SLUG}`, noIndex: true })
  return buildMetadata({ title: `${partner.name} — NYC Firearms Training`, description: partner.headline, path: trainingPartnerPath(partner), noIndex: partner.visibility !== "public" })
}

export default async function YarivBenAriPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const partner = trainingPartnerBySlug(SLUG)
  if (!partner) notFound()
  if (partner.visibility === "public") return <TrainingPartnerProfile partner={partner} />

  const { preview } = await searchParams
  if (preview) {
    const to = encodeURIComponent(trainingPartnerPath(partner))
    redirect(preview === "off" ? `/partner-preview?to=${to}&off=1` : `/partner-preview?to=${to}&code=${encodeURIComponent(preview)}`)
  }
  if (await hasPreviewAccess()) return <><TrainingPartnerProfile partner={partner} /><PartnerPreviewChip path={trainingPartnerPath(partner)} /></>
  return <PartnerComingSoon path={trainingPartnerPath(partner)} />
}
