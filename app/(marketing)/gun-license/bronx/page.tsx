import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Gun License in The Bronx",
  description:
    "Applying for a gun license from the Bronx: identical citywide NYPD rules, and a practical way to coordinate the notarized signatures the application asks other people to give.",
  path: "/gun-license/bronx",
})

/** The Bronx's angle: coordinating the humans — references and household affidavits. */

const FAQS = [
  {
    q: "Does the Bronx have its own gun license requirements?",
    a: "No. The NYPD License Division handles handgun licensing for all five boroughs under one set of rules. A Bronx applicant does the same 18 hours of training, provides the same four notarized character references, discloses the same history, and is investigated to the same standard as anyone else in New York City.",
  },
  {
    q: "Who should I ask to be a character reference?",
    a: "The rule is four character references, and they must be notarized. It does not hand you a list of names. The practical test is simple: pick people who will actually sit down, fill the form out completely, and get to a notary — because an application waits on its slowest reference. Someone who knows you well and follows through beats someone impressive who doesn't.",
  },
  {
    q: "What if a reference or a household member won't get their form notarized?",
    a: "Then your application waits, because there is no version of this that skips them. Four notarized references and a notarized affidavit from every adult in your home are requirements, not preferences. If someone genuinely won't do it, you need to know that in week one and ask someone else — not discover it in month four.",
  },
  {
    q: "Everyone I'd ask lives in the neighborhood. Does that help?",
    a: "It helps with logistics, not with the outcome. Nearby references are easier to get to a notary, and that is worth something real, because the paperwork stage is the only part of the timeline you control. It does not influence the NYPD's decision, which stays entirely within the License Division's investigative discretion.",
  },
]

export default function BronxGunLicensePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license/manhattan" },
          { name: "The Bronx", path: "/gun-license/bronx" },
        ]}
      />
      <PageHero
        eyebrow="The Bronx"
        title="Gun license in The Bronx"
        subtitle="Same citywide rules as everywhere else. The part that decides your timeline is other people's signatures."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A gun license application from the Bronx is judged under the same citywide NYPD rules as
          one from anywhere else in New York City — <strong>no borough has its own requirements</strong>.
          What decides how long your application takes to assemble is not the rulebook; it is
          coordination. Four notarized character references, plus a notarized affidavit from every
          adult living in your home, means the largest obstacle between you and a complete file is
          other people finding an hour and a notary. Nothing else in this process depends so heavily
          on someone who is doing you a favor.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          The signatures are the schedule
        </h2>
        <p className="mt-3 text-text-mid">
          Count the people before you count the weeks. Four character references, each of whom has to
          complete a form and have it notarized. Then every adult who lives in your home, each of whom
          signs a notarized affidavit. Depending on your household, that is commonly six, seven, or
          eight separate human beings who each need to do a small errand they did not ask for. None of
          them are in a hurry. All of them mean well.
        </p>
        <p className="mt-3 text-text-mid">
          This is where applications die quietly — not rejected, just never finished. So treat it like
          the project it is. Ask everyone up front, in one pass, and tell them plainly what you need
          and roughly how long it takes. Choose references for reliability rather than for their title;
          the form does not award points for impressiveness, and a reference who never gets to the
          notary is worth nothing at all. Give people a deadline that isn&apos;t &ldquo;whenever.&rdquo;
          Chase kindly and chase early.
        </p>
        <p className="mt-3 text-text-mid">
          One order-of-operations note, because it costs Bronx applicants real money: your training
          certificate has to be dated within six months of when you file. If you knock out the 18 hours
          first and then spend the next five months chasing signatures, the certificate can expire
          before the file is done and the hours start over. Gather the humans first. Book the training
          once the end is in sight. The rules behind all of it, with sources:
        </p>
        <FactList
          facts={[FACTS.references, FACTS.cohabitants, FACTS.trainingClock, FACTS.discretion]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Know who you&apos;ll need to ask — and whether it&apos;s worth asking yet.
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
          { label: "Gun license in Manhattan", href: "/gun-license/manhattan" },
          { label: "Gun license in Queens", href: "/gun-license/queens" },
        ]}
      />
    </>
  )
}
