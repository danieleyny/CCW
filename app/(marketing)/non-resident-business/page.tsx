import Link from "next/link"
import { brand } from "@/config/brand"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

/**
 * NOTE ON THE TITLE: the brief's phrasing was "NYC Gun License: Non-Residents &
 * Business Owners" (47 chars), which busts both the <=42 title budget and the
 * <=60 rendered budget once the ` · Gun License NYC` template lands. Trimmed to
 * keep the head keyword; "business owners" carries in the H1 and description.
 *
 * NOTE ON FACTS: we have NO attorney-verified source for the non-resident or
 * Special Carry rules — so this page describes only what WE do and routes every
 * rule question to /resources and /contact. Do not add a specific non-resident
 * requirement here without a primary source in content/facts.ts.
 */
export const metadata = buildMetadata({
  title: "NYC Gun License for Non-Residents",
  description:
    "Don't live in NYC but work or run a business here? There's a separate track for non-residents and business owners. Here's how it differs and how we scope it.",
  path: "/non-resident-business",
  ogTitle: `NYC Gun License: Non-Residents & Business Owners · ${brand.name}`,
})

const FAQS = [
  {
    q: "Can I get a NYC gun license if I don't live in New York City?",
    a: "There's a separate track for people who don't live in the five boroughs but have a real, ongoing connection here — a business, a job, property, or a regular commute. It works differently from a resident application, and the specifics depend on your situation, so it's worth a conversation before you start gathering paperwork.",
  },
  {
    q: "What's the difference between a premises license and a carry license?",
    a: "In plain terms: a premises license is tied to a place — you keep the handgun at that home or business address, with limited transport. A carry license lets you carry it. They ask for different things and they're not interchangeable, so pick the one that matches what you actually need before you file.",
  },
  {
    q: "What is the Special Carry license?",
    a: "It's the NYC track that comes up for people whose connection to the city is a business or work rather than a residence. The rules are set by the NYPD License Division and New York State, not by us — we won't paraphrase them here. Read the official pages on our resources page, or call us and we'll walk through your setup.",
  },
  {
    q: "Do the training rules change if I'm not a NYC resident?",
    a: "New York's 18-hour training requirement is a state rule, and the certificate has to be dated within 6 months of when you file. Where you live doesn't change the clock on that.",
  },
  {
    q: "Can you file the application for my business?",
    a: "No. You submit your own application, always — a consulting firm can't submit for you or represent you before the License Division. What we do is prepare the documents, keep the sequence straight, and manage the case so nothing expires while you're waiting on something else.",
  },
  {
    q: "How much does the non-resident track cost?",
    a: "It's scoped case by case, because these files vary a lot more than a standard resident application. Tell us your situation and we'll quote a flat fee before you commit to anything.",
  },
]

export default function NonResidentBusinessPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Non-residents & business owners", path: "/non-resident-business" },
        ]}
      />
      <PageHero
        eyebrow="Non-residents & business owners"
        title="NYC gun license for non-residents and business owners"
        subtitle="You don't live in the five boroughs, but your work is here. That's a different track — here's the plain version."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          If you don&apos;t live in New York City but you work here, run a business here, or own
          property here, you aren&apos;t stuck — there&apos;s a{" "}
          <strong>separate track for non-residents and business owners</strong>, and it works
          differently from a resident application. The two things to sort out first are which license
          you actually need (premises, tied to an address, versus carry) and how you document your
          connection to the city. The rules are set by the NYPD License Division and New York State,
          and they turn on your specific setup — so this page tells you how the tracks differ and
          then hands you to the official sources or to us.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Premises versus carry, in plain English
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-card p-5">
            <p className="engraved text-brass">Premises</p>
            <p className="mt-1 font-display text-lg font-semibold">Tied to a place</p>
            <p className="mt-2 text-sm text-text-mid">
              A premises license attaches the handgun to an address — a home or a business location.
              You keep it there, and transporting it is limited. For a lot of business owners,
              that&apos;s the honest fit: the gun stays at the shop.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-card p-5">
            <p className="engraved text-brass">Carry</p>
            <p className="mt-1 font-display text-lg font-semibold">Tied to you</p>
            <p className="mt-2 text-sm text-text-mid">
              A carry license is about carrying the handgun with you rather than storing it at one
              address. It asks for more, and it takes longer. If your reason for wanting this is
              movement — cash runs, site visits, a commute — this is the conversation to have.
            </p>
          </div>
        </div>
        <p className="mt-4 text-text-mid">
          The <strong>Special Carry</strong> track is the one that usually comes up when your tie to
          the city is a business rather than an address. What it asks of you is set by the License
          Division and the State — we&apos;re not going to paraphrase those rules from memory and
          have you plan around our paraphrase. The official pages are collected on our{" "}
          <Link href="/resources" className="text-signal hover:underline">
            resources page
          </Link>
          , and if you&apos;d rather just describe your situation out loud,{" "}
          <Link href="/contact" className="text-signal hover:underline">
            talk to us
          </Link>
          .
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">What we actually do</h2>
        <p className="mt-3 text-text-mid">
          These files vary more than a standard resident application, so we scope them one at a time
          rather than dropping you into a package that doesn&apos;t fit.
        </p>
        <ul className="mt-5 space-y-3 text-text-mid">
          <li className="rounded-lg border border-hairline bg-card p-4">
            <strong className="text-text-hi">A dedicated track.</strong> We build the checklist
            around your setup — where you live, where the business is, what you need the license to
            let you do — instead of the generic one.
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            <strong className="text-text-hi">Custom-scoped, flat fee.</strong> We look at your
            situation, tell you what it takes, and quote you before you commit. See{" "}
            <Link href="/pricing" className="text-signal hover:underline">
              pricing
            </Link>{" "}
            for the standard tracks.
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            <strong className="text-text-hi">Documents and deadlines handled.</strong> Business
            records, references, affidavits, the training certificate&apos;s 6-month clock — we keep
            the sequence straight so nothing goes stale while you&apos;re chasing something else.
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            <strong className="text-text-hi">You submit it.</strong> Always. We prepare and manage;
            the application is yours to review and file.
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What holds true no matter where you live
        </h2>
        <p className="mt-3 text-text-mid">
          A few things don&apos;t bend for non-residents. These are sourced — check them yourself:
        </p>
        <FactList facts={[FACTS.age, FACTS.training, FACTS.trainingClock, FACTS.youFile]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Every non-resident case is a little different. Start with the basics, or just call{" "}
            <a href={`tel:${brand.contact.phone.replace(/\D/g, "")}`} className="text-signal hover:underline">
              {brand.contact.phone}
            </a>
            .
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "What we charge", href: "/pricing" },
          { label: "What a NYC gun license requires", href: "/requirements" },
          { label: "Talk to us about your case", href: "/contact" },
          { label: "Official sources and forms", href: "/resources" },
        ]}
      />
    </>
  )
}
