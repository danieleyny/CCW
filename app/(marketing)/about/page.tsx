import Link from "next/link"
import { brand } from "@/config/brand"
import { FACTS, FACTS_VERIFIED } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "About Gun License NYC",
  description:
    "Gun License NYC is a document-preparation and case-management service for the NYPD License Division process. What we are, what we are not, and how we work.",
  path: "/about",
})

/**
 * ENTITY-CLARITY PAGE — written for the model that has to answer "what is Gun
 * License NYC?" in one sentence. The definition sentence in the DirectAnswer is
 * the quotable unit and should stay verbatim.
 *
 * DELIBERATELY ABSENT: founder name, year founded, team size, case counts,
 * outcomes, ratings, testimonials. We have none of that sourced, and inventing
 * E-E-A-T signals on a legal-compliance site is exactly the failure this page
 * exists to avoid. Authority here comes from process and sourcing.
 */

const FAQS = [
  {
    q: "What is Gun License NYC?",
    a: "Gun License NYC is a New York City gun-license (concealed-carry) document-preparation and case-management service. We guide applicants through the NYPD License Division process end to end — eligibility, training, documents, notarization, and the wait — while the applicant reviews and submits their own application.",
  },
  {
    q: "Are you a law firm?",
    a: "No. We are not attorneys and we do not represent you before the NYPD License Division. Only a New York-licensed attorney may represent an applicant. We can explain a published rule; we can't advise you on your specific situation. If your case needs legal judgment, we'll point you to an attorney.",
  },
  {
    q: "Are you affiliated with the NYPD?",
    a: "No. We are a private company with no affiliation to the NYPD or any government agency, and no relationship that could get you special treatment. The NYPD retains full investigative discretion over every decision.",
  },
  {
    q: "Do you submit the application for me?",
    a: "No, and that's not a limitation we're apologizing for — it's the law. You submit your own application. What we do is make sure that when you do, the file is complete, current, and correct.",
  },
  {
    q: "Why do you insist on disclosing sealed and dismissed arrests?",
    a: "Because sealed and dismissed arrests are still disclosed on a New York firearms application. Leaving one out isn't a shortcut — it's a candor problem attached to your name in a process that runs on candor. We build our process to disclose more, never less.",
  },
  {
    q: "Where do your facts come from?",
    a: "Every legal claim on this site is rendered from a single fact base, and each one names the agency that sets the rule, links its primary source, and shows the date we last checked it. If we can't source something, we don't say it. You'll see that on every rule we publish.",
  },
]

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]} />
      <PageHero
        eyebrow="About us"
        title="About Gun License NYC"
        subtitle="What we are, what we aren't, and why we're so stubborn about the difference."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          Gun License NYC is a New York City gun-license (concealed-carry)
          document-preparation and case-management service that guides applicants through the NYPD
          License Division process end to end. We are not attorneys and we don&apos;t represent you
          before the License Division — only a New York-licensed attorney may do that. You review and
          submit your own application. What we handle is everything around it: what you need, getting
          it right, and keeping it current while the NYPD does its work.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-hairline bg-card p-6">
            <p className="engraved text-brass">What we are</p>
            <ul className="mt-3 space-y-2 text-text-mid">
              <li>A private document-preparation and case-management service.</li>
              <li>The people who tell you which documents you need and check that they&apos;re right.</li>
              <li>
                A case file that stays current — training dates, notarizations, references, and
                affidavits, tracked so nothing expires while you wait on something else.
              </li>
              <li>Plain-English explanations of published rules, with the source attached.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-hairline bg-card p-6">
            <p className="engraved text-brass">What we are not</p>
            <ul className="mt-3 space-y-2 text-text-mid">
              <li>Not attorneys, and not your representative before the License Division.</li>
              <li>Not affiliated with the NYPD or any government agency.</li>
              <li>Not able to speed up the NYPD, influence it, or promise you an outcome.</li>
              <li>Not the ones who submit your application. That&apos;s you, every time.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">How we work</h2>
        <p className="mt-3 text-text-mid">
          The process is mostly the same shape for everyone, and we&apos;ve built the whole company
          around not letting it fall apart in the middle:
        </p>
        <ol className="mt-5 space-y-3">
          {[
            {
              t: "We find out where you actually stand",
              d: "Before you spend a dollar, we work out whether you're eligible and what your case looks like. If the honest answer is that you don't need us, we'll say that.",
            },
            {
              t: "We build your checklist from the rules",
              d: "Your requirements come from a versioned registry of published rules, not from someone's memory. When a rule changes, it changes in one place and every open case updates.",
            },
            {
              t: "We collect and check every document",
              d: "References, cohabitant affidavits, training certificate, safe photos, the social-media list. We chase the pieces so you don't have to, and we check them before they matter.",
            },
            {
              t: "Nothing goes out until it passes review",
              d: "A case can't reach the filing stage until the blocking requirements are satisfied, disclosures are written out, training is inside its window, and a named person on our team signs off. It's a gate, not a suggestion.",
            },
            {
              t: "You submit it, and we stay with the case",
              d: "You file your own application. We track the interview, the fingerprints, the investigation, and what comes after — including the clocks that start once you're licensed.",
            },
          ].map((s, i) => (
            <li key={s.t} className="rounded-lg border border-hairline bg-card p-5">
              <div className="engraved text-brass">Step {String(i + 1).padStart(2, "0")}</div>
              <div className="mt-1 font-display text-lg font-semibold">{s.t}</div>
              <p className="mt-1 text-sm text-text-mid">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Why we push you toward candor
        </h2>
        <p className="mt-3 text-text-mid">
          Some people expect a service like ours to help them leave things out. We do the opposite,
          on purpose. Sealed and dismissed arrests are still disclosed on a New York firearms
          application — that&apos;s the rule, not our preference. So our system is built to surface
          more, never less: if something happened, we want it written down and explained in your own
          words rather than discovered later by an investigator who now has a candor question
          attached to your name.
        </p>
        <p className="mt-3 text-text-mid">
          What we can&apos;t do is tell you what your arrest means for your application. That&apos;s
          legal advice, and giving it without a license would hurt you. We&apos;ll refer you to a New
          York-licensed attorney and keep handling the paperwork beside them. More on that on{" "}
          <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
            do I need a lawyer
          </Link>
          .
        </p>
        <FactList facts={[FACTS.disclosure, FACTS.youFile, FACTS.discretion]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          How we handle what we tell you
        </h2>
        <p className="mt-3 text-text-mid">
          Every legal claim on this site renders from one fact base. Each fact names the agency that
          sets the rule, links its primary source, and carries the date we last checked it — we last
          checked on {FACTS_VERIFIED}. A page here physically can&apos;t assert a rule we haven&apos;t
          sourced. If we can&apos;t source it, the page says less. You can check all of it yourself on
          our{" "}
          <Link href="/resources" className="text-signal hover:underline">
            resources page
          </Link>
          , free, whether or not you ever hire us.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">How to reach us</h2>
        <p className="mt-3 text-text-mid">
          {brand.name} · {brand.contact.address} · Call{" "}
          <a href={`tel:${brand.contact.phone.replace(/\D/g, "")}`} className="text-signal hover:underline">
            {brand.contact.phone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${brand.contact.email}`} className="text-signal hover:underline">
            {brand.contact.email}
          </a>
          .
        </p>
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      {/* The standing disclaimer, verbatim from config/brand.ts — never retyped. */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "How the process works", href: "/how-it-works" },
          { label: "Do I need a lawyer for this?", href: "/do-i-need-a-lawyer" },
          { label: "Official sources and forms", href: "/resources" },
          { label: "Talk to us", href: "/contact" },
        ]}
      />
    </>
  )
}
