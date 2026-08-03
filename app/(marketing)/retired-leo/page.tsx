import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Retired LEO Carry in NYC (LEOSA)",
  description:
    "How the federal Law Enforcement Officers Safety Act (LEOSA) works for qualified retired officers, and how it relates to a NYC gun license. Sourced.",
  path: "/retired-leo",
})

/**
 * Retired-LEO / LEOSA. The claim is from the sourced, attorney-approved fact base
 * (18 U.S.C. §926C). Framing is careful: LEOSA is FEDERAL and separate from a
 * NYC/NY license, it has conditions and limits, and specific eligibility is a
 * legal question routed to an attorney.
 */
const FAQS = [
  {
    q: "Can a retired police officer carry a concealed firearm under LEOSA?",
    a: "Under the federal Law Enforcement Officers Safety Act (18 U.S.C. §926C), a “qualified retired law enforcement officer” who meets the statute's conditions may carry a concealed firearm nationwide, subject to the statute's limits and to state laws about where carry is prohibited. Whether a specific person qualifies is a legal question.",
  },
  {
    q: "What are the main LEOSA requirements for a retired officer?",
    a: "The statute's conditions include an aggregate of at least 10 years of law-enforcement service (or separation due to a service-connected disability), separation in good standing, current annual firearms qualification, and carrying the required photo identification. The exact requirements are set by federal law, not by us.",
  },
  {
    q: "Is LEOSA the same as a NYC gun license?",
    a: "No. LEOSA is a federal authority that exists separately from New York's licensing. A retired officer may still choose to hold a New York license, and how the NYPD License Division treats retired-law-enforcement applicants is a separate question from LEOSA itself.",
  },
  {
    q: "Does LEOSA override New York's sensitive-location rules?",
    a: "LEOSA has limits and does not erase every state or local restriction on where a firearm may be carried. Because the interaction between federal LEOSA authority and New York's rules can be nuanced, a retired officer with specific questions should confirm them with a licensed attorney.",
  },
]

export default function RetiredLeoPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Retired law enforcement", path: "/retired-leo" }]} />
      <PageHero
        eyebrow="Retired law enforcement"
        title="Retired law enforcement carry & LEOSA"
        subtitle="How the federal Law Enforcement Officers Safety Act fits alongside New York's licensing — the general framework, sourced to the statute."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          The federal <strong>Law Enforcement Officers Safety Act (LEOSA)</strong> lets a{" "}
          <strong>qualified retired law enforcement officer</strong> who meets its conditions carry a
          concealed firearm — subject to the statute&apos;s limits and to state laws on where carry is
          prohibited. LEOSA is <strong>federal and separate</strong> from a New York license. Whether a
          particular person qualifies, and how LEOSA interacts with New York&apos;s rules, are legal
          questions for an attorney.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The federal framework</h2>
        <p className="mt-3 text-text-mid">
          LEOSA is set by Congress, not by us. Here is the statute and what it broadly provides for
          qualified retired officers:
        </p>
        <FactList facts={[FACTS.leosaRetired]} />
        <p className="mt-6 rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
          This is general information, not legal advice. Retired-officer eligibility and the interplay
          with New York&apos;s sensitive-location rules turn on specifics, so{" "}
          <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
            speak with a licensed attorney
          </Link>{" "}
          for your situation.
        </p>
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">Considering a New York license as well? See where you stand.</p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Premises vs carry licenses", href: "/premises-vs-carry" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Reciprocity", href: "/reciprocity" },
          { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
        ]}
      />
    </>
  )
}
