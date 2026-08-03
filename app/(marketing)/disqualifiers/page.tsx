import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "What Disqualifies You From a NYC Gun License",
  description:
    "The general legal criteria the NYPD weighs — good moral character, convictions, controlled-substance use, and mental-health history. General information, not advice about your case.",
  path: "/disqualifiers",
})

/**
 * Disqualifiers — the highest legal-sensitivity page. Guardrail: explaining the
 * GENERAL statutory criteria is fine; advising on a specific person's record is
 * the practice of law. So this page states the standards (all from the sourced,
 * attorney-approved fact base), never enumerates a case-by-case list, and routes
 * every specific question to the attorney-referral seam — top, middle, bottom.
 */
const FAQS = [
  {
    q: "What disqualifies you from getting a gun license in NYC?",
    a: "New York sets the standards: an applicant must be of good moral character, must not have been convicted of a felony or a “serious offense,” must not be an unlawful user of a controlled substance, and must not have been involuntarily committed to a mental-health facility, among other criteria. Whether any specific history affects a given application is a legal question for an attorney.",
  },
  {
    q: "Can I get a NYC gun license with a misdemeanor or an old arrest?",
    a: "It depends on the specifics, and that's exactly the kind of question we can't answer for you — doing so would be legal advice. New York disclosure rules are strict: even sealed and dismissed arrests are disclosed on a firearms application. If you have any conviction or arrest history, talk to a licensed attorney before you file.",
  },
  {
    q: "Do I have to disclose a sealed or dismissed arrest?",
    a: "Yes. Sealed and dismissed arrests are still disclosed on a New York firearms application. We are candor-maximizing, never disclosure-minimizing — no part of this process should ever suggest leaving something out.",
  },
  {
    q: "Is there anything extra for a carry license specifically?",
    a: "Yes. For an unrestricted carry license, an applicant must not have been convicted within the preceding five years of certain offenses, including specified assault, misdemeanor DWI, or menacing offenses. The exact application of that rule to a specific record is a legal question for an attorney.",
  },
]

export default function DisqualifiersPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Disqualifiers", path: "/disqualifiers" }]} />
      <PageHero
        eyebrow="Eligibility"
        title="What disqualifies you from a NYC gun license"
        subtitle="The general legal criteria the NYPD weighs — stated plainly, sourced to the statute. What none of this can do is tell you how your own record will be treated."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          New York law sets out who may be licensed. Broadly, an applicant must be of{" "}
          <strong>good moral character</strong>, must not have been convicted of a{" "}
          <strong>felony or a &ldquo;serious offense,&rdquo;</strong> must not be an{" "}
          <strong>unlawful user of a controlled substance</strong>, and must not have been{" "}
          <strong>involuntarily committed</strong> to a mental-health facility, among other criteria.
          These are general standards — <strong>whether any specific history disqualifies a given
          person is a legal question, and we don&apos;t answer it. A licensed attorney does.</strong>
        </DirectAnswer>
      </section>

      {/* The routing seam, up top — before anyone reads a criterion and self-diagnoses. */}
      <section className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="rounded-xl border border-signal/40 bg-signal-dim p-5">
          <p className="text-sm text-text-hi">
            <strong>This is general information, not legal advice.</strong> Explaining a rule is one
            thing; advising on your specific arrest or conviction is the practice of law. If your
            history raises any question,{" "}
            <Link href="/do-i-need-a-lawyer" className="font-medium text-signal hover:underline">
              speak with a New York-licensed attorney
            </Link>{" "}
            before you file.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The criteria New York sets</h2>
        <p className="mt-3 text-text-mid">
          Each of these is set by New York State law, not by us. We link the primary source for every
          one:
        </p>
        <FactList
          facts={[
            FACTS.characterStandard,
            FACTS.disqualifyingConvictions,
            FACTS.controlledSubstance,
            FACTS.mentalHealthCriteria,
            FACTS.carryFiveYearBar,
            FACTS.disclosure,
          ]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Questions about your own record belong with an attorney — not a form. Not sure where you
            stand overall?
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/eligibility">Check your eligibility</Link>
            </Button>
            <Link href="/do-i-need-a-lawyer" className="text-sm font-medium text-text-mid hover:text-foreground">
              Do I need a lawyer? &rarr;
            </Link>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
          { label: "If your application is denied", href: "/denied-appeal" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Premises vs carry licenses", href: "/premises-vs-carry" },
        ]}
      />
    </>
  )
}
