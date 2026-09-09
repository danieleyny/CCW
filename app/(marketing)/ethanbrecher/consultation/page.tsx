import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { brand } from "@/config/brand"
import { partnerBySlug, partnerFullName, partnerConsultationPath } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"
import { CredentialBadge, INDEPENDENCE_DISCLAIMER } from "@/components/marketing/partner-card"
import { ConsultationForm } from "@/components/marketing/consultation-form"
import type { Partner } from "@/config/partners"

const SLUG = "ethanbrecher"

// A consultation request form is never a search-index target.
export function generateMetadata(): Metadata {
  const partner = partnerBySlug(SLUG)
  const name = partner ? partnerFullName(partner) : "our attorney partner"
  return buildMetadata({
    title: `Request a consultation — ${name}`,
    description: `Request a consultation with ${name}, an independent New York-licensed attorney.`,
    path: `/${SLUG}/consultation`,
    noIndex: true,
  })
}

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const partner = partnerBySlug(SLUG)
  if (!partner) notFound()

  // Public partner: render statically, never touching cookies/searchParams.
  if (partner.visibility === "public") {
    return <ConsultationPageBody partner={partner} />
  }

  // coming_soon: the same preview gate as the profile. A ?preview=<code>/off link
  // routes through the cookie handler and lands back here clean.
  const { preview } = await searchParams
  if (preview) {
    const to = encodeURIComponent(partnerConsultationPath(partner))
    redirect(preview === "off" ? `/partner-preview?to=${to}&off=1` : `/partner-preview?to=${to}&code=${encodeURIComponent(preview)}`)
  }

  if (await hasPreviewAccess()) {
    return (
      <>
        <ConsultationPageBody partner={partner} />
        <PartnerPreviewChip path={partnerConsultationPath(partner)} />
      </>
    )
  }
  return <PartnerComingSoon path={partnerConsultationPath(partner)} />
}

function ConsultationPageBody({ partner }: { partner: Partner }) {
  const rate = `$${partner.rate.amount}/${partner.rate.unit}`
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
          { name: partnerFullName(partner), path: `/${partner.slug}` },
          { name: "Request a consultation", path: partnerConsultationPath(partner) },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="max-w-2xl">
          <SectionEyebrow>Independent legal counsel</SectionEyebrow>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Request a consultation
          </h1>
          <p className="mt-4 text-lg text-text-mid">
            Tell {partnerFullName(partner)} what you need to talk through. We forward your request to
            him directly — he reviews each one personally and reaches out to arrange the call.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem] lg:items-start">
          {/* FORM — lead column */}
          <div className="lg:order-1 lg:col-start-1">
            <ConsultationForm
              partner={{
                slug: partner.slug,
                name: partner.name,
                fullName: partnerFullName(partner),
                rate: partner.rate,
              }}
            />
          </div>

          {/* WHO YOU'RE WRITING TO — compact card, above the form on mobile */}
          <aside className="lg:order-2 lg:col-start-2 lg:row-start-1">
            <div className="rounded-xl border border-hairline bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="size-16 shrink-0 overflow-hidden rounded-md border border-hairline bg-surface-2">
                  <Image
                    src={partner.photo.src}
                    alt={partner.photo.alt}
                    width={128}
                    height={160}
                    sizes="4rem"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold leading-tight text-text-hi">
                    {partnerFullName(partner)}
                  </p>
                  <p className="mt-0.5 text-sm text-brass">{partner.firm}</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                <CredentialBadge primary>{partner.yearsInPractice} years in practice</CredentialBadge>
                {partner.honors.map((h) => (
                  <CredentialBadge key={h.label} primary={h.tier === "primary"}>
                    {h.label}
                  </CredentialBadge>
                ))}
              </ul>
              <p className="mt-4 border-t border-hairline pt-4 text-sm text-text-low">
                <span className="font-medium text-text-hi">{rate}</span> · billed by his office
              </p>
            </div>
          </aside>
        </div>

        {/* DISCLAIMERS */}
        <div className="mt-12 max-w-3xl space-y-3 border-t border-hairline pt-8">
          <p className="text-xs leading-relaxed text-text-low">{INDEPENDENCE_DISCLAIMER}</p>
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
        </div>
      </div>
    </>
  )
}
