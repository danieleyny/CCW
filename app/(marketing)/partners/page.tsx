import { brand } from "@/config/brand"
import { publishedPartners } from "@/config/partners"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, attorneyDirectorySchema } from "@/components/marketing/json-ld"
import { DirectAnswer, RelatedLinks } from "@/components/marketing/page-blocks"
import { PartnerCard } from "@/components/marketing/partner-card"

export const metadata = buildMetadata({
  title: "Our Partners — Attorneys We Refer You To",
  description:
    "We prepare NYC gun-license applications; we're not a law firm. When a case needs a lawyer, we refer you to an independent New York-licensed attorney.",
  path: "/partners",
})

/**
 * The attorney-referral directory. Renders entirely from config/partners.ts; a partner
 * with published:false never appears, so the empty state (below) is the honest default
 * until the first partner is confirmed and published.
 */
export default function PartnersPage() {
  const partners = publishedPartners()

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Partners", path: "/partners" }]} />
      {partners.length > 0 && <JsonLd data={attorneyDirectorySchema(partners)} />}
      <PageHero
        eyebrow="Our Partners"
        title="Attorneys we refer you to"
        subtitle="The people we send you to when a case needs more than we can give."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6">
        <DirectAnswer>
          We prepare applications. We are <strong>not a law firm</strong>, and we do not represent
          anyone before the NYPD License Division — only a New York-licensed attorney may. When a
          case needs a lawyer, we would rather hand you to someone we would use ourselves than leave
          you searching.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
        </div>
      </section>

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
