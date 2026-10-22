import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { brand } from "@/config/brand"
import { publishedPartners, previewablePartners, type Partner } from "@/config/partners"
import { publishedTrainingPartners, previewableTrainingPartners, type TrainingPartner } from "@/config/training-partners"
import { buildMetadata } from "@/lib/seo"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, attorneyDirectorySchema } from "@/components/marketing/json-ld"
import { DirectAnswer, RelatedLinks } from "@/components/marketing/page-blocks"
import { PartnerCard } from "@/components/marketing/partner-card"
import { PartnerAdvertisingFooter } from "@/components/marketing/partner-advertising-footer"
import { TrainingPartnerCard } from "@/components/marketing/training-partner-card"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"

export function generateMetadata(): Metadata {
  // Indexed only once a partner is public; a coming-soon directory is noindex.
  return buildMetadata({
    title: "Partners — legal & training",
    description:
      "Independent legal and training professionals we make available to NYC gun-license applicants.",
    path: "/partners",
    noIndex: publishedPartners().length === 0 && publishedTrainingPartners().length === 0,
  })
}

/**
 * The attorney-referral directory. Live (indexed, static) once a partner is public;
 * a coming-soon screen behind the preview cookie until then; the honest empty state if
 * no partner exists at all (kept for the case a partner is ever unpublished).
 */
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const publicAttorneys = publishedPartners()
  const publicTrainers = publishedTrainingPartners()

  // Public directory: static, indexed, never reads cookies/searchParams.
  if (publicAttorneys.length > 0 || publicTrainers.length > 0) {
    return <Directory attorneys={publicAttorneys} trainers={publicTrainers} indexed />
  }

  // Coming-soon / empty mode (dynamic is fine — not indexed).
  const previewableAttorneys = previewablePartners()
  const previewableTrainers = previewableTrainingPartners()
  if (previewableAttorneys.length === 0 && previewableTrainers.length === 0) {
    return <Directory attorneys={[]} trainers={[]} indexed={false} />
  }

  const { preview } = await searchParams
  if (preview) {
    redirect(preview === "off" ? `/partner-preview?to=%2Fpartners&off=1` : `/partner-preview?to=%2Fpartners&code=${encodeURIComponent(preview)}`)
  }

  if (await hasPreviewAccess()) {
    return (
      <>
        <Directory attorneys={previewableAttorneys} trainers={previewableTrainers} indexed={false} />
        <PartnerPreviewChip path="/partners" />
      </>
    )
  }
  return <PartnerComingSoon path="/partners" />
}

function Directory({ attorneys, trainers, indexed }: { attorneys: Partner[]; trainers: TrainingPartner[]; indexed: boolean }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Partners", path: "/partners" }]} />
      {indexed && attorneys.length > 0 && <JsonLd data={attorneyDirectorySchema(attorneys)} />}
      <PageHero
        eyebrow="Our Partners"
        title="Independent professionals"
        subtitle="Legal and training professionals available when a case needs more than we can provide."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="pb-4 pt-8">
          <DirectAnswer>
            We prepare application materials. We are <strong>not a law firm</strong> and do not
            represent anyone before the NYPD License Division. Our independent partners handle their
            own professional services, communications and fees directly with you.
          </DirectAnswer>
        </section>

        <section className="py-6">
          {attorneys.length === 0 && trainers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--rule)] bg-[var(--paper)] p-8 text-center">
              <p className="text-[var(--ink-soft)]">
                We&apos;re finalising our partner network. In the meantime, if your case needs a
                lawyer, tell us and we&apos;ll point you to a New York-licensed attorney.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {trainers.length > 0 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-text-hi">Independent training providers</h2>
                    <p className="mt-2 text-text-mid">Training is arranged directly with the provider. You remain responsible for reviewing and submitting your own application.</p>
                  </div>
                  {trainers.map((partner) => <TrainingPartnerCard key={partner.slug} partner={partner} />)}
                </div>
              )}
              {attorneys.length > 0 && (
                <div className="space-y-8">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-text-hi">Independent legal counsel</h2>
                  {attorneys.map((partner) => (
                    <div key={partner.slug}>
                      <PartnerCard partner={partner} />
                      <PartnerAdvertisingFooter partner={partner} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="border-t border-[var(--rule)] py-8">
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{brand.disclaimer}</p>
        </section>
      </div>

      <RelatedLinks
        links={[
          { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
          { label: "If your NYC gun license is denied", href: "/denied-appeal" },
          { label: "What disqualifies you", href: "/disqualifiers" },
          { label: "Contact our team", href: "/contact" },
        ]}
      />
    </>
  )
}
