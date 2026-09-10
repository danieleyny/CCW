import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { DirectAnswer, FactList } from "@/components/marketing/page-blocks"
import { ArticleTemplate } from "@/components/marketing/v2/article-template"

export const metadata = buildMetadata({
  title: "NYC Gun License Disqualifiers",
  description:
    "The general legal criteria the NYPD weighs for a NYC gun license — character, convictions, controlled substances, mental health. General info, not advice.",
  path: "/disqualifiers",
})

/**
 * Disqualifiers — the highest legal-sensitivity page. Guardrail: explaining the
 * GENERAL statutory criteria is fine; advising on a specific person's record is
 * the practice of law. So this page states the standards (all from the sourced,
 * attorney-approved fact base), never enumerates a case-by-case list, and routes
 * every specific question to the attorney-referral seam — top, middle, bottom.
 * Rendered through the v2 interior article template.
 */

const linkStyle = { color: "var(--electric-deep)", textDecoration: "none" as const }

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
    <ArticleTemplate
      eyebrow="Eligibility"
      title="What disqualifies you from a NYC gun license"
      lede="The general legal criteria the NYPD weighs — stated plainly, sourced to the statute. What none of this can do is tell you how your own record will be treated."
      breadcrumb={[
        { name: "Home", path: "/" },
        { name: "Disqualifiers", path: "/disqualifiers" },
      ]}
      meta={["Reviewed September 2026", "General information, not legal advice"]}
      sections={[
        {
          id: "article-answer",
          heading: "The general standards",
          navLabel: "The standards",
          body: (
            <>
              <DirectAnswer>
                New York law sets out who may be licensed. Broadly, an applicant must be of{" "}
                <strong>good moral character</strong>, must not have been convicted of a{" "}
                <strong>felony or a &ldquo;serious offense,&rdquo;</strong> must not be an{" "}
                <strong>unlawful user of a controlled substance</strong>, and must not have been{" "}
                <strong>involuntarily committed</strong> to a mental-health facility, among other
                criteria. These are general standards —{" "}
                <strong>
                  whether any specific history disqualifies a given person is a legal question, and we
                  don&apos;t answer it. A licensed attorney does.
                </strong>
              </DirectAnswer>
              <div className="article-callout" style={{ marginTop: 24 }}>
                <strong>This is general information, not legal advice.</strong>
                <p>
                  Explaining a rule is one thing; advising on your specific arrest or conviction is the
                  practice of law. If your history raises any question,{" "}
                  <Link href="/do-i-need-a-lawyer" style={linkStyle}>
                    speak with a New York-licensed attorney
                  </Link>{" "}
                  before you file.
                </p>
              </div>
            </>
          ),
        },
        {
          id: "article-criteria",
          heading: "The criteria New York sets",
          navLabel: "The criteria",
          body: (
            <>
              <p>
                Each of these is set by New York State law, not by us. We link the primary source for
                every one:
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
            </>
          ),
        },
      ]}
      faqs={FAQS}
      cta={{
        href: "/eligibility",
        label: "Check your eligibility",
        note: "Questions about your own record belong with an attorney — not a form. Not sure where you stand overall?",
      }}
      related={[
        { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
        { label: "If your application is denied", href: "/denied-appeal" },
        { label: "Everything a NYC gun license requires", href: "/requirements" },
        { label: "Premises vs carry licenses", href: "/premises-vs-carry" },
      ]}
    />
  )
}
