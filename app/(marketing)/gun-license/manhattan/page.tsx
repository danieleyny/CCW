import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Gun License in Manhattan",
  description:
    "Applying for a gun license from Manhattan: why a central address changes nothing about the NYPD process, and the storage and household questions that come up in Manhattan apartments.",
  path: "/gun-license/manhattan",
})

/**
 * BOROUGH PAGES — the honest framing. The NYPD License Division process is
 * centralized: one set of rules, one division, one standard for all five
 * boroughs. There is no borough-specific rule to write about, and inventing one
 * would be both a lie and a legal problem. So each page varies the ANGLE — the
 * questions applicants in that borough actually ask — and says outright that the
 * rules are identical citywide. Manhattan's angle: proximity buys nothing.
 */

const FAQS = [
  {
    q: "Is the gun license process different in Manhattan?",
    a: "No. The NYPD License Division runs one centralized process for all five boroughs. The same forms, the same 18 hours of training, the same four notarized references, the same investigation, and the same standard apply whether you live in Manhattan or anywhere else in New York City. Your borough is an address on the application, not a category.",
  },
  {
    q: "Does living in Manhattan make my application move faster?",
    a: "No. Being close to the process is not the same as being ahead in it. The License Division keeps full investigative discretion over both the decision and the pace of it, and there is no queue that a Manhattan address moves you up. Roughly six months from a complete submission is typical citywide. The only part of the calendar anyone can influence is the part before you file.",
  },
  {
    q: "I live in a Manhattan studio. Do I still need a gun safe?",
    a: "Photographs of your gun safe — door open and door closed — are part of the application, and New York's safe-storage rules apply to your home regardless of its square footage. A small apartment does not exempt you from either. Sort out where the safe goes before you photograph it, not after.",
  },
  {
    q: "My Manhattan building is a co-op. Does the NYPD ask my landlord or board?",
    a: "The requirement the rules do impose is a notarized affidavit from every adult living in your home. That is about the people inside your apartment, not your board, your managing agent, or your neighbors. If other adults share the unit with you, each of them signs.",
  },
]

export default function ManhattanGunLicensePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license/manhattan" },
          { name: "Manhattan", path: "/gun-license/manhattan" },
        ]}
      />
      <PageHero
        eyebrow="Manhattan"
        title="Gun license in Manhattan"
        subtitle="Same rules as every other borough. Here's what Manhattan applicants actually ask about — and the one assumption worth dropping early."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          Getting a gun license in Manhattan means applying under exactly the same NYPD rules as
          every other borough — <strong>there is no separate Manhattan process, form, or standard</strong>.
          The License Division handles handgun licensing centrally for all of New York City, so a
          Manhattan address gets you the same 18 hours of training, the same four notarized
          references, the same investigation, and the same roughly six-month wait from a complete
          submission. Being central buys you nothing on the calendar. What it does change is the
          shape of a few practical questions — storage in a small apartment, and who counts as an
          adult in your household.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Proximity is not progress
        </h2>
        <p className="mt-3 text-text-mid">
          The most common thing we hear from Manhattan applicants is some version of &ldquo;I&apos;m
          right here — that has to count for something.&rdquo; It doesn&apos;t. Handgun licensing in
          New York City is centralized, which cuts both ways: it means nobody in the outer boroughs
          is at a disadvantage, and it means nobody in Manhattan is at an advantage. There is no
          local desk, no borough queue, and no shortcut that a subway ride creates. The NYPD retains
          full investigative discretion over the decision and its timing, and anyone who tells you a
          Manhattan address changes that is selling something we won&apos;t.
        </p>
        <p className="mt-3 text-text-mid">
          Where Manhattan genuinely does differ is the housing. Studios, shares, and converted
          one-bedrooms raise two questions more often here than anywhere else in the city. The first
          is storage: the safe photographs are part of the application and the state&apos;s
          safe-storage rules apply no matter how little floor you have. The second is the household.
          A roommate is an adult living in your home, and every adult living in your home signs a
          notarized affidavit — so a two-bedroom share means two signatures, and finding that out in
          week one is much cheaper than finding it out in month four.
        </p>
        <p className="mt-3 text-text-mid">
          Everything below is a rule someone else set. Here are the sources:
        </p>
        <FactList
          facts={[FACTS.safe, FACTS.storage, FACTS.cohabitants, FACTS.discretion, FACTS.timeline]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Your borough doesn&apos;t decide where you stand. Your file does.
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "What a NYC gun license costs", href: "/cost" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "How long a NYC gun license takes", href: "/timeline" },
          { label: "Gun license in Brooklyn", href: "/gun-license/brooklyn" },
          { label: "Gun license in Queens", href: "/gun-license/queens" },
        ]}
      />
    </>
  )
}
