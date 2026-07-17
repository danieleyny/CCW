import Link from "next/link"
import { brand } from "@/config/brand"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "If Your NYC Gun License Is Denied",
  description:
    "Denied a NYC gun license? A denial isn't necessarily the end — but challenging one is legal representation. Here's what we can help with and when to call an attorney.",
  path: "/denied-appeal",
})

/**
 * THE MOST LEGALLY SENSITIVE PAGE ON THE SITE. Challenging a denial is
 * representation before the License Division, which only a New York-licensed
 * attorney may do (FACTS.youFile) — so this page's job is to hand the reader to
 * one, fast, and to be useful only in the narrow band where we're allowed to be.
 *
 * DELIBERATELY ABSENT: appeal deadlines, procedures, forms, venues, and odds.
 * We have no sourced fact for any of them (content/facts.ts), and a wrong number
 * here could blow someone's window. The page says the License Division sets the
 * procedure and an attorney should advise on the specifics. Do not add one
 * without a primary source in content/facts.ts.
 */

const FAQS = [
  {
    q: "My NYC gun license was denied. Is that the end?",
    a: "Not necessarily. A denial is a decision you may be able to challenge, and many people have paths available to them. But that challenge is legal representation, so the person to talk to next is a New York-licensed attorney — not us, and not a consultant.",
  },
  {
    q: "Can you appeal my denial for me?",
    a: "No. Only a New York-licensed attorney may represent an applicant before the NYPD License Division. We're a document-preparation and case-management service, not a law firm, so we can't file a challenge or argue one. We'd be doing you harm if we tried.",
  },
  {
    q: "How long do I have to challenge a denial?",
    a: "The License Division sets the timelines and the procedure, and they can turn on the specifics of your letter. We won't quote you a deadline we can't source, because being wrong about it could cost you the option entirely. Read your denial letter and get it in front of a New York-licensed attorney quickly.",
  },
  {
    q: "Why was I denied?",
    a: "The NYPD retains full investigative discretion over the decision, and the reasoning lives in your letter and your file rather than in any public formula. That's part of why an attorney matters here — reading what actually happened in your case is the first real step.",
  },
  {
    q: "Can I get my documents and case record from you?",
    a: "Yes. Everything in your case file is yours. Ask and we'll get you a complete copy — documents, dates, and what was submitted — so you or your attorney can work from the actual record instead of memory.",
  },
  {
    q: "Can I just apply again?",
    a: "Maybe, and maybe that's the better route than a challenge — but that's a legal judgment about your specific situation, which is exactly the kind of advice we're not permitted to give. An attorney can tell you which door makes sense.",
  },
]

export default function DeniedAppealPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "If you're denied", path: "/denied-appeal" },
        ]}
      />
      <PageHero
        eyebrow="If you're denied"
        title="If your NYC gun license is denied"
        subtitle="This is the point where you want a lawyer, and we'd rather say so than sell you something."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A denial isn&apos;t necessarily the end — but it is the point where you should talk to a{" "}
          <strong>New York-licensed attorney</strong>. Challenging a denial means being represented
          before the NYPD License Division, and only an attorney may do that. We can&apos;t, and we
          won&apos;t pretend otherwise. The NYPD retains full investigative discretion over the
          decision, the License Division sets the timelines and the procedure, and what applies to
          you depends on your letter and your file. Get both in front of an attorney soon.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What we can honestly help with
        </h2>
        <p className="mt-3 text-text-mid">
          There&apos;s a narrow band here where we&apos;re actually useful, and it&apos;s worth
          being precise about it.
        </p>
        <ul className="mt-5 space-y-3">
          <li className="rounded-lg border border-hairline bg-card p-4">
            <p className="font-display font-semibold text-text-hi">Your record is yours</p>
            <p className="mt-1 text-text-mid">
              If you worked with us, your complete case file — every document, every date, exactly
              what was submitted — belongs to you. Ask and we&apos;ll send it over. An attorney
              working from the real record beats one working from recollection.
            </p>
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            <p className="font-display font-semibold text-text-hi">
              Understanding what was in the file
            </p>
            <p className="mt-1 text-text-mid">
              We can walk you through what was submitted and when. That&apos;s describing your own
              paperwork back to you — not advice about what it means or what to do next.
            </p>
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            <p className="font-display font-semibold text-text-hi">A referral</p>
            <p className="mt-1 text-text-mid">
              Tell us what happened and we&apos;ll point you toward a New York-licensed attorney who
              handles firearms licensing. That&apos;s the most valuable thing we have for you today.
            </p>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What we won&apos;t tell you
        </h2>
        <p className="mt-3 text-text-mid">
          We won&apos;t quote you a deadline, a procedure, or your odds. We don&apos;t have a sourced
          answer for any of those, and this is the worst possible place to guess — a wrong date could
          close a door you still have open. The License Division sets the procedure and the
          timelines; a New York-licensed attorney should read your letter and advise on what applies
          to you. Anyone who is not an attorney and tells you otherwise is doing you a disservice.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          The two rules that govern this
        </h2>
        <FactList facts={[FACTS.youFile, FACTS.discretion]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-xl border border-hairline bg-card p-6 text-center">
            <p className="text-text-mid">
              If you were denied, reach out and we&apos;ll get you your file and point you to a New
              York-licensed attorney. Call{" "}
              <a href={`tel:${brand.contact.phone.replace(/\D/g, "")}`} className="text-signal hover:underline">
                {brand.contact.phone}
              </a>{" "}
              or email{" "}
              <a href={`mailto:${brand.contact.email}`} className="text-signal hover:underline">
                {brand.contact.email}
              </a>
              .
            </p>
          </div>
          <div className="mt-8 text-center">
            <p className="mb-5 text-text-mid">
              Haven&apos;t applied yet, and want to know where you stand first?
            </p>
            <Button asChild size="lg">
              <Link href="/eligibility">Check your eligibility</Link>
            </Button>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Do I need a lawyer for this?", href: "/do-i-need-a-lawyer" },
          { label: "What a NYC gun license requires", href: "/requirements" },
          { label: "Official sources and forms", href: "/resources" },
          { label: "Talk to us", href: "/contact" },
        ]}
      />
    </>
  )
}
