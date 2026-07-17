import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Gun License in Queens",
  description:
    "Applying for a gun license from Queens: the same citywide NYPD rules, plus the scheduling reality of fitting 18 hours of training and a live-fire session around a working week.",
  path: "/gun-license/queens",
})

/** Queens's angle: the borough is enormous and works odd hours — training logistics. */

const FAQS = [
  {
    q: "Is there a different gun license process for Queens?",
    a: "No. The NYPD License Division licenses handguns centrally for the whole city, and the requirements are identical in Queens, Manhattan, Brooklyn, the Bronx, and Staten Island. Same training hours, same references, same disclosures, same investigation, same standard. Nothing about a Queens address changes the rule you are held to.",
  },
  {
    q: "Do I have to take the training course in Queens?",
    a: "The rule is that your 18 hours — 16 hours of classroom plus 2 hours of live-fire — are completed with a state-approved instructor, and it says nothing about which borough that instructor teaches in. Choose on schedule and approval, not on proximity. Many Queens applicants find the classroom hours and the live-fire session are not even in the same place.",
  },
  {
    q: "Can I do the 18 hours on weekends?",
    a: "Instructors set their own schedules, so it depends entirely on the instructor you pick. That is exactly why it's worth asking about the calendar before you pay. Sixteen classroom hours plus a live-fire session is a real commitment on top of a working week, and 'when can you actually seat me' is a fair first question.",
  },
  {
    q: "I work long hours. What should I line up first?",
    a: "Not the training. Your certificate has to be dated within six months of when you file, so taking the course first and then spending months on paperwork can push it out of date. Start with the parts that depend on other people — the four notarized references and the affidavits from the adults in your home — and slot the 18 hours in as the file comes together.",
  },
]

export default function QueensGunLicensePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license/manhattan" },
          { name: "Queens", path: "/gun-license/queens" },
        ]}
      />
      <PageHero
        eyebrow="Queens"
        title="Gun license in Queens"
        subtitle="One set of citywide rules — and a borough big enough that the real question is when you'll find 18 hours."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A Queens gun license application follows the same citywide NYPD rules as every other
          borough — <strong>the requirements do not change from neighborhood to neighborhood</strong>.
          The Queens-specific part is logistics, not law. Queens is the largest borough by area and
          one of the most spread out, so the 18 hours of required training — 16 classroom hours plus
          2 hours of live-fire — is often the piece that decides an applicant&apos;s calendar. The
          rule cares that a state-approved instructor taught you and that your certificate is dated
          within six months of filing. It does not care how far you travelled to sit in the room.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          The 18 hours are a scheduling problem, not a legal one
        </h2>
        <p className="mt-3 text-text-mid">
          Queens runs on shift work. Airport schedules, hospital rotations, contractors, drivers,
          restaurant hours, small businesses that don&apos;t close — a meaningful share of the people
          who ask us about licensing here do not have a normal Monday-to-Friday to plan around. The
          training requirement doesn&apos;t bend for that. Sixteen hours of classroom instruction plus
          two hours of live-fire, with a written test passed at 80 percent or higher, is the same
          number of hours whether you find them across two weekends or six weeknights.
        </p>
        <p className="mt-3 text-text-mid">
          So pick your instructor on their calendar and their state approval, not on the map. There
          is no borough requirement attached to training, and the classroom hours and the live-fire
          portion frequently happen in different places anyway — a range is a range regardless of
          which side of the borough line it sits on. Ask what a course actually costs, ask when they
          can seat you, and ask how the live-fire session gets scheduled, because that is usually the
          piece with the least flexibility.
        </p>
        <p className="mt-3 text-text-mid">
          Then mind the clock on the certificate. It has to be dated within six months of when you
          file, which means training is the last thing you line up, not the first. The rules, with
          sources:
        </p>
        <FactList facts={[FACTS.training, FACTS.trainingClock, FACTS.references, FACTS.timeline]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Before you book 18 hours, find out where you stand. It takes a few minutes.
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
          { label: "Gun license in The Bronx", href: "/gun-license/bronx" },
        ]}
      />
    </>
  )
}
