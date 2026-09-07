import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { brand } from "@/config/brand"
import { publishedPartners, previewablePartners, type Partner } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { hasPreviewAccess } from "@/lib/partners/preview"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, attorneyDirectorySchema } from "@/components/marketing/json-ld"
import { DirectAnswer, RelatedLinks } from "@/components/marketing/page-blocks"
import { PartnerCard } from "@/components/marketing/partner-card"
import { PartnerComingSoon } from "@/components/marketing/partner-coming-soon"
import { PartnerPreviewChip } from "@/components/marketing/partner-preview-chip"

export function generateMetadata(): Metadata {
  // Indexed only once a partner is public; a coming-soon directory is noindex.
  return buildMetadata({
    title: "Our Partners — Attorneys We Refer You To",
    description:
      "We prepare NYC gun-license applications; we're not a law firm. When a case needs a lawyer, we refer you to an independent New York-licensed attorney.",
    path: "/partners",
    noIndex: publishedPartners().length === 0,
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
  const publicOnes = publishedPartners()

  // Public directory: static, indexed, never reads cookies/searchParams.
  if (publicOnes.length > 0) {
    return <Directory partners={publicOnes} indexed />
  }

  // Coming-soon / empty mode (dynamic is fine — not indexed).
  const previewable = previewablePartners()
  if (previewable.length === 0) {
    return <Directory partners={[]} indexed={false} />
  }

  const { preview } = await searchParams
  if (preview) {
    redirect(preview === "off" ? `/partner-preview?to=%2Fpartners&off=1` : `/partner-preview?to=%2Fpartners&code=${encodeURIComponent(preview)}`)
  }

  if (await hasPreviewAccess()) {
    return (
      <>
        <Directory partners={previewable} indexed={false} />
        <PartnerPreviewChip path="/partners" />
      </>
    )
  }
  return <PartnerComingSoon path="/partners" />
}

function Directory({ partners, indexed }: { partners: Partner[]; indexed: boolean }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Partners", path: "/partners" }]} />
      {indexed && partners.length > 0 && <JsonLd data={attorneyDirectorySchema(partners)} />}
      <PageHero
        eyebrow="Our Partners"
        title="Attorneys we refer you to"
        subtitle="The people we send you to when a case needs more than we can give."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="pb-4 pt-8">
          <DirectAnswer>
            We prepare applications. We are <strong>not a law firm</strong>, and we do not represent
            anyone before the NYPD License Division — only a New York-licensed attorney may. When a
            case needs a lawyer, we would rather hand you to someone we would use ourselves than leave
            you searching.
          </DirectAnswer>
        </section>

        <section className="py-6">
          {partners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-hairline bg-card p-8 text-center">
              <p className="text-text-mid">
                We&apos;re finalising our partner network. In the meantime, if your case needs a
                lawyer, tell us and we&apos;ll point you to a New York-licensed attorney.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {partners.map((p) => (
                <PartnerCard key={p.slug} partner={p} />
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-hairline py-8">
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
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
