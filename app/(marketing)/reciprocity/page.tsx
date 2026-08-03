import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "NYC Gun License Reciprocity",
  description:
    "Does New York honor an out-of-state carry permit, and does a NYC license work elsewhere? The honest answer, sourced — plus where to confirm the current rules.",
  path: "/reciprocity",
})

/**
 * Reciprocity. The INBOUND claim (NY doesn't recognize other states' permits) is
 * from the sourced, attorney-approved fact base. The OUTBOUND direction (whether
 * another state honors a NY license) is framed as "decided by that state's law —
 * check that state," deliberately WITHOUT a state-by-state matrix we can't keep
 * current (per the legal-review note).
 */
const FAQS = [
  {
    q: "Does New York honor an out-of-state concealed carry permit?",
    a: "No. New York does not recognize handgun-carry permits issued by other states. To carry a handgun in New York, a person generally must hold a valid New York license — a permit from another state does not authorize carry here.",
  },
  {
    q: "I'm moving to NYC with a permit from another state. Can I carry?",
    a: "Not on the other state's permit. New York doesn't recognize it. If you become a New York resident, you'd apply for a New York license through the NYPD License Division like any other applicant. Until you're licensed here, don't rely on your old permit to carry in New York.",
  },
  {
    q: "Will my NYC license let me carry in other states?",
    a: "That's decided by each destination state's own law, not by New York — some states recognize a New York license and many do not, and it can change. Before you travel with a firearm, confirm the current rules for the specific state you're going to.",
  },
  {
    q: "How do I keep up with reciprocity changes?",
    a: "Reciprocity rules change as states and courts act. The safest habit is to re-check the destination state's official guidance before each trip rather than relying on a list that may be out of date.",
  },
]

export default function ReciprocityPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Reciprocity", path: "/reciprocity" }]} />
      <PageHero
        eyebrow="Reciprocity"
        title="NYC gun license reciprocity, honestly"
        subtitle="Two questions people conflate — whether New York honors your out-of-state permit, and whether a New York license works elsewhere. They have different answers."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          <strong>New York does not recognize carry permits from other states.</strong> To carry a
          handgun in New York, you generally need a valid New York license — an out-of-state permit
          does not authorize carry here. In the other direction, whether a New York license is honored
          somewhere else is decided by <strong>that</strong> state&apos;s law, not New York&apos;s, so
          the only reliable answer is to check the specific state you&apos;re traveling to.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Coming into New York</h2>
        <p className="mt-3 text-text-mid">
          This is the part people most often get wrong. New York is not a reciprocity state: it does
          not accept another state&apos;s permit as authority to carry within New York. The rule below
          is set by New York, and here is the source:
        </p>
        <FactList facts={[FACTS.noReciprocity]} />

        <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">Leaving New York</h2>
        <p className="mt-3 text-text-mid">
          Whether another state honors your New York license is that state&apos;s decision. Some do,
          many don&apos;t, and the answer shifts as laws and court rulings change. We deliberately
          don&apos;t publish a state-by-state list here — a stale list is worse than none. Confirm the
          current rules for your destination with that state&apos;s official source before you travel
          with a firearm.
        </p>
        <p className="mt-4 rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
          Reciprocity questions tied to your specific plans or record are legal questions. For those,{" "}
          <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
            talk to a licensed attorney
          </Link>
          , and use our{" "}
          <Link href="/resources" className="text-signal hover:underline">
            official sources
          </Link>{" "}
          page to reach the primary references.
        </p>
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">Becoming a New Yorker and want to be licensed here? Start with a quick check.</p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Premises vs carry licenses", href: "/premises-vs-carry" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Non-residents & business licenses", href: "/non-resident-business" },
          { label: "Official sources", href: "/resources" },
        ]}
      />
    </>
  )
}
