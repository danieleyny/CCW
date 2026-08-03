import Link from "next/link"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, definedTermSetSchema } from "@/components/marketing/json-ld"
import { DirectAnswer, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "NYC Gun License Glossary",
  description:
    "Plain-language definitions of the NYC gun-license terms — CCIA, DCJS, premises vs. carry, cohabitant affidavit, and more — each linked to the details.",
  path: "/glossary",
})

/**
 * THE GLOSSARY — a DefinedTermSet. Every term is either purely definitional
 * (what an acronym stands for, what a document is) or restates a claim we already
 * source elsewhere on the site; none asserts a NEW legal rule. Deliberately
 * ABSENT: "proper cause" — that standard was struck down (NYSRPA v. Bruen, 2022)
 * and the CCIA replaced it, so publishing it as a current requirement would be
 * wrong. Each term deep-links to the page that explains it in full.
 */

interface Term {
  term: string
  definition: string
  /** Deep-link to the pillar/guide that covers it in depth. */
  path?: string
}

const TERMS: Term[] = [
  {
    term: "18-hour course",
    definition:
      "New York's required firearms-safety training for a carry license: 16 hours of classroom instruction plus 2 hours of live-fire, with a written test passed at 80% or higher, taught by a state-approved instructor.",
    path: "/18-hour-ccia-course-nyc",
  },
  {
    term: "Carry license",
    definition:
      "A handgun license that authorizes carrying a handgun concealed. The unrestricted carry license permits concealed carry without regard to a particular place of possession.",
    path: "/premises-vs-carry",
  },
  {
    term: "CCIA (Concealed Carry Improvement Act)",
    definition:
      "The 2022 New York State law that sets the current concealed-carry licensing requirements, including the 18-hour training and the social-media disclosure.",
    path: "/requirements",
  },
  {
    term: "Character reference",
    definition:
      "A person who attests to your character as part of the application. Four character references are required, and each must be notarized.",
    path: "/nyc-gun-license-character-references",
  },
  {
    term: "Cohabitant affidavit",
    definition:
      "A notarized statement required from every adult who lives in your home, submitted as part of your application.",
    path: "/cohabitant-affidavit-nyc-gun-license",
  },
  {
    term: "DCJS",
    definition:
      "The New York State Division of Criminal Justice Services — the agency behind the state fingerprint fee and the approval of firearms-training instructors.",
    path: "/resources",
  },
  {
    term: "Disqualifying conviction",
    definition:
      "A conviction — anywhere — for a felony or a “serious offense” as defined by New York law, which bars a handgun license.",
    path: "/disqualifiers",
  },
  {
    term: "Dismissed arrest",
    definition:
      "An arrest whose charges were dismissed. It is still disclosed on a New York firearms application — a dismissal does not remove the disclosure obligation.",
    path: "/sealed-dismissed-arrest-nyc-gun-license",
  },
  {
    term: "Fingerprinting",
    definition:
      "Taken in person at the NYPD License Division after your documents are reviewed; NYPD schedules it and collects the state fingerprint fee there. There is no third-party vendor for this license type.",
    path: "/fees",
  },
  {
    term: "Good moral character",
    definition:
      "The statutory licensing standard: the essential character, temperament, and judgment necessary to be entrusted with a firearm.",
    path: "/disqualifiers",
  },
  {
    term: "LEOSA",
    definition:
      "The federal Law Enforcement Officers Safety Act (18 U.S.C. §926C). A qualified retired law-enforcement officer who meets its conditions may carry concealed, subject to the statute's limits and state carry-prohibited-place laws.",
    path: "/retired-leo",
  },
  {
    term: "License Division",
    definition:
      "The NYPD unit that receives and investigates handgun-license applications in New York City, conducts the interview, and issues the decision.",
    path: "/how-it-works",
  },
  {
    term: "Live-fire",
    definition:
      "The 2-hour range portion of the 18-hour training, where you demonstrate safe, competent handling of a handgun in person.",
    path: "/18-hour-ccia-course-nyc",
  },
  {
    term: "Notarization",
    definition:
      "Signing a document in front of a commissioned notary who verifies identity and witnesses the signature. New York permits remote online notarization over a live audio-video session.",
    path: "/cohabitant-affidavit-nyc-gun-license",
  },
  {
    term: "NYPD License Division interview",
    definition:
      "A scheduled meeting, part of the investigation, where the License Division reviews your submitted application with you and asks about what's in it.",
    path: "/nyc-license-division-interview",
  },
  {
    term: "Premises license",
    definition:
      "A handgun license that authorizes possessing a handgun at one specified location — a dwelling or a place of business. It does not authorize carrying in public.",
    path: "/premises-vs-carry",
  },
  {
    term: "Recertification",
    definition:
      "The periodic confirmation New York requires on the State's schedule to keep a license from lapsing — distinct from renewing the license itself.",
    path: "/renewal",
  },
  {
    term: "Reciprocity",
    definition:
      "Recognition of out-of-state permits. New York does not recognize handgun-carry permits issued by other states; a person generally must hold a valid New York license to carry a handgun in New York.",
    path: "/reciprocity",
  },
  {
    term: "Renewal",
    definition:
      "Reapplying at the end of a license's term. NYPD mails renewal instructions; renewals need no character references but do require a current live-fire certificate.",
    path: "/renewal",
  },
  {
    term: "Safe storage",
    definition:
      "New York's statutory rules for securing a handgun once you are licensed — a continuing legal obligation, not a one-time application step.",
    path: "/nyc-safe-storage-rules",
  },
  {
    term: "Sealed arrest",
    definition:
      "An arrest record sealed under New York law (CPL Article 160). It is still disclosed on a New York firearms application; sealing does not remove the disclosure obligation.",
    path: "/sealed-dismissed-arrest-nyc-gun-license",
  },
  {
    term: "Serious offense",
    definition:
      "A category of offenses defined by New York law that can disqualify a handgun-license applicant. The specific list is statutory.",
    path: "/disqualifiers",
  },
  {
    term: "Social-media disclosure",
    definition:
      "A three-year list of your social media accounts, which the application asks you to compile and submit.",
    path: "/nyc-gun-license-social-media-disclosure",
  },
  {
    term: "Special Carry license",
    definition:
      "A distinct track for people who don't live in New York City but have a place of business here, or otherwise need to carry across city lines.",
    path: "/non-resident-business",
  },
  {
    term: "Term (license term)",
    definition:
      "The length a license is valid before it must be renewed. A NYC carry license is issued for a three-year term.",
    path: "/renewal",
  },
]

export default function GlossaryPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Glossary", path: "/glossary" }]} />
      <JsonLd
        data={definedTermSetSchema(
          "NYC gun license glossary",
          "Plain-language definitions of the terms used in the NYC gun-license process.",
          TERMS
        )}
      />
      <PageHero
        eyebrow="Glossary"
        title="NYC gun license glossary"
        subtitle="The words the process uses, in plain language — each linked to the page that covers it in full."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6">
        <DirectAnswer>
          This glossary defines the terms you&apos;ll meet applying for a NYC gun license — from the
          CCIA and the License Division to premises vs. carry, the cohabitant affidavit, and
          recertification. Each entry is plain-language and links to the page that explains it in
          full. For anything specific to your own situation, we point you to a licensed attorney
          rather than give legal advice.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <dl className="space-y-3">
          {TERMS.map((t) => (
            <div key={t.term} className="rounded-xl border border-hairline bg-card p-5">
              <dt className="font-display text-lg font-semibold text-text-hi">
                {t.path ? (
                  <Link href={t.path} className="hover:text-signal">
                    {t.term}
                  </Link>
                ) : (
                  t.term
                )}
              </dt>
              <dd className="mt-1.5 text-text-mid">{t.definition}</dd>
              {t.path && (
                <Link href={t.path} className="mt-2 inline-block text-sm text-signal hover:underline">
                  More on {t.term.replace(/\s*\(.*\)\s*/, "").toLowerCase()} &rarr;
                </Link>
              )}
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Premises vs. carry — which you need", href: "/premises-vs-carry" },
          { label: "Current government fees", href: "/fees" },
          { label: "Official sources and forms", href: "/resources" },
        ]}
      />
    </>
  )
}
