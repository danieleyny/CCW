import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { externalCostEstimates } from "@/config/brand"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { CostCard } from "@/components/marketing/cost-card"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "How Much Does a NYC Gun License Cost?",
  description:
    "The honest all-in cost of a NYC gun license — our fee, the NYPD and State fees you pay directly, plus typical training and notary ranges. Nothing marked up.",
  path: "/cost",
})

export default async function CostPage() {
  const supabase = await createClient()
  const [packages, fees] = await Promise.all([getActivePackages(supabase), getFees(supabase)])
  const concierge = packages.find((p) => p.key === "full_concierge") ?? packages.find((p) => p.featured)

  // Every number here is computed from the same DB rows the rest of the site uses.
  const govCents = fees.applicationCents + fees.fingerprintCents
  const low = (concierge?.priceCents ?? 0) + externalCostEstimates.training.lowCents + govCents + externalCostEstimates.notary.lowCents
  const high = (concierge?.priceCents ?? 0) + externalCostEstimates.training.highCents + govCents + externalCostEstimates.notary.highCents
  const usd = (c: number) => `$${(Math.round(c / 5000) * 50).toLocaleString("en-US")}`

  const FAQS = [
    {
      q: "How much does a NYC gun license cost in total?",
      a: `Expect roughly ${usd(low)} to ${usd(high)} all-in. That includes the ${fees.applicationFee} NYPD application fee and the ${fees.fingerprintFee} State fingerprint fee, which you pay directly to the government, plus your 18-hour training course and notarization — both billed by the providers, not by us. Our concierge fee is the only part paid to Gun License NYC.`,
    },
    {
      q: "What is the NYPD gun license application fee?",
      a: `The NYPD handgun license application fee is ${fees.applicationFee}. It is paid directly to the NYPD, it is not refundable, and it is never collected by us.`,
    },
    {
      q: "What does the fingerprinting cost?",
      a: `The fingerprint fee is ${fees.fingerprintFee}, paid to New York State. Like the application fee, it is not refundable and we never collect it.`,
    },
    {
      q: "How much is the 18-hour training course?",
      a: "Instructors set their own prices, so it varies — typically a few hundred dollars in New York City. You pay your instructor directly and we never mark it up.",
    },
    {
      q: "Are there costs you don't tell me about up front?",
      a: "No. The breakdown on this page is the whole picture: our fee, the two government fees, training, and notarization. If a cost isn't listed here, we didn't hide it — tell us and we'll add it.",
    },
  ]

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Cost", path: "/cost" }]} />
      <PageHero
        eyebrow="What it costs"
        title="How much does a NYC gun license cost?"
        subtitle="No games with pricing. Here is every dollar, who it goes to, and which part is actually ours."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A NYC gun license costs roughly <strong>{usd(low)} to {usd(high)} all-in</strong>. That
          breaks down into the {fees.applicationFee} NYPD application fee and the{" "}
          {fees.fingerprintFee} State fingerprint fee — both paid directly to the government — plus
          your 18-hour safety course and notarization, which are billed by those providers. Only the
          concierge fee is paid to Gun License NYC, and we never mark up anything else.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {concierge && (
          <CostCard
            concierge={{ name: concierge.name, priceCents: concierge.priceCents }}
            fees={fees}
            estimates={externalCostEstimates}
          />
        )}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Who sets these costs</h2>
        <p className="mt-3 text-text-mid">
          We don&apos;t set any of the government amounts, and we can&apos;t refund them. Here&apos;s
          who does, and where to check us:
        </p>
        <FactList facts={[FACTS.applicationFee, FACTS.fingerprintFee, FACTS.training]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "How long a NYC gun license takes", href: "/timeline" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Compare our packages", href: "/pricing" },
          { label: "Official sources and fees", href: "/resources" },
        ]}
      />
    </>
  )
}
