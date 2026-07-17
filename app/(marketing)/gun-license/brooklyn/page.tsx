import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Gun License in Brooklyn",
  description:
    "Applying for a gun license from Brooklyn: the citywide NYPD rules, plus the household affidavits and address questions that trip up shared apartments and multi-family homes.",
  path: "/gun-license/brooklyn",
})

/** Brooklyn's angle: proving where you live, and the adults who live there with you. */

const FAQS = [
  {
    q: "Are the gun license rules different in Brooklyn?",
    a: "No. Handgun licensing in New York City is centralized at the NYPD License Division, and the rules are identical in all five boroughs. Brooklyn applicants complete the same 18 hours of training, the same four notarized references, the same disclosures, and face the same investigation as everyone else. There is no Brooklyn form and no Brooklyn standard.",
  },
  {
    q: "Who counts as an adult living in my home?",
    a: "A notarized affidavit is required from every adult living in your home — and 'home' means the residence you live in, not the building. A roommate in your apartment signs. A partner who lives with you signs. Your parents downstairs in a separate unit are a separate household. When it's genuinely unclear where the line falls, ask before you file rather than guessing on the form.",
  },
  {
    q: "I live in a Brooklyn apartment with three roommates. Is that a problem?",
    a: "It isn't a disqualifier — it's a scheduling problem. Each adult in your home signs a notarized affidavit, so four adults means four people who each have to sit down with a notary. That's the single most common reason a Brooklyn application sits unfinished. Ask everyone early and make the notary step easy for them.",
  },
  {
    q: "Does my landlord have to know I'm applying?",
    a: "Nothing in the rules requires you to notify a landlord, and we won't tell you what to do about your lease — that's between you and your agreement. What the rules do require is the household affidavits from the adults who live with you, the safe photographs, and compliance with New York's safe-storage rules once you're licensed.",
  },
]

export default function BrooklynGunLicensePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license/manhattan" },
          { name: "Brooklyn", path: "/gun-license/brooklyn" },
        ]}
      />
      <PageHero
        eyebrow="Brooklyn"
        title="Gun license in Brooklyn"
        subtitle="The rules are citywide. The hard part in Brooklyn is usually the people you live with — and getting them to a notary."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A Brooklyn gun license application is governed by the same citywide NYPD rules as one filed
          from any other borough — <strong>the borough you live in changes nothing about the process</strong>.
          What tends to be harder in Brooklyn is the household paperwork: a notarized affidavit is
          required from every adult living in your home, and Brooklyn has a lot of homes with a lot
          of adults in them — shared apartments, multi-family houses, families under one roof. Every
          one of those signatures is a person with their own schedule, and collecting them is the
          most common reason a Brooklyn file stalls before it is ever filed.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Where you live, and who lives there with you
        </h2>
        <p className="mt-3 text-text-mid">
          Brooklyn housing is not one thing. A brownstone floor-through, a four-person share off the
          L, a two-family house where the same family occupies both units — the NYPD rule is the same
          in all of them, but the amount of work it creates is not. Every adult living in your home
          signs a notarized affidavit. Four adults means four separate trips to a notary, four
          people remembering to bring ID, and four chances for the whole package to wait on one
          person who keeps meaning to get to it.
        </p>
        <p className="mt-3 text-text-mid">
          Add the four character references — also notarized, also other people&apos;s calendars — and
          a Brooklyn applicant is frequently chasing eight signatures from eight humans. That is the
          real work, and it is entirely front-loaded. It is also the part where your training
          certificate quietly ages out: the certificate has to be dated within six months of when you
          file, so if you take the 18 hours first and then spend five months collecting affidavits,
          you can end up taking the course twice.
        </p>
        <p className="mt-3 text-text-mid">
          The order that works: find out who has to sign before you do anything else, ask them, then
          book the training so the certificate is fresh when the file is done. The rules driving all
          of this, with sources:
        </p>
        <FactList
          facts={[FACTS.cohabitants, FACTS.references, FACTS.trainingClock, FACTS.storage]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Find out who needs to sign before you spend a dollar on training.
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
          { label: "Gun license in Queens", href: "/gun-license/queens" },
          { label: "Gun license in Manhattan", href: "/gun-license/manhattan" },
        ]}
      />
    </>
  )
}
