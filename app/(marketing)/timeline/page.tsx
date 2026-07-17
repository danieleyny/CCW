import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "How Long Does a NYC Gun License Take?",
  description:
    "Roughly six months from a complete submission to a decision — what happens in each stage, what actually causes delays, and the parts you can control.",
  path: "/timeline",
})

/**
 * Timeline is the second-most-asked question after cost, and the one where a
 * marketing site is most tempted to lie. Every duration here traces to
 * FACTS.timeline; nothing on this page suggests the wait can be shortened,
 * because it can't be (FACTS.discretion).
 */

const STAGES = [
  {
    stage: "Getting your file ready",
    when: "Weeks, and it's the part you control",
    body: "Nothing starts until your application is complete. This is where the 18 hours of training, four notarized references, statements from the adults in your home, and the rest of the paperwork come together. Most people lose more time here than anywhere else — and it's the only stretch where moving faster is up to you.",
  },
  {
    stage: "You file it",
    when: "One day",
    body: "You submit your own application to the NYPD License Division and pay the fees directly. We can't file it for you, and neither can any other consulting firm.",
  },
  {
    stage: "Interview and fingerprinting",
    when: "Scheduled by the License Division",
    body: "The NYPD brings you in to go through your application in person and takes your prints. Your prints then go to New York State and the FBI.",
  },
  {
    stage: "Background and character investigation",
    when: "The long middle",
    body: "This is the bulk of the six months. An investigator runs your criminal history, contacts your references, and looks at the picture your application paints. There's no queue you can see and no status bar. It takes what it takes.",
  },
  {
    stage: "The decision letter",
    when: "The end of the road",
    body: "The License Division writes to you with its decision. If something is missing or unclear, expect a request for more information first — which pauses the clock until you answer.",
  },
]

const DELAYS = [
  {
    title: "An incomplete package",
    body: "The single biggest cause of delay. A missing signature, an unnotarized reference, an unanswered question — each one buys a letter from the License Division and weeks of waiting for your reply. The six months only starts counting from a complete submission.",
  },
  {
    title: "Your training certificate aging out",
    body: "Your certificate has to be dated within six months of filing. People finish the 18 hours early, then spend months chasing references — and the certificate goes stale before the package is ready. Then it's 18 hours again. Take the course when the rest of your file is close to done, not before.",
  },
  {
    title: "Chasing your references",
    body: "Four people have to sit down, fill out a form, and get it notarized. They're doing you a favor and they have their own lives. Ask early, ask people who'll actually follow through, and make the notary part easy for them.",
  },
  {
    title: "Everyone at home",
    body: "Every adult living in your home has to sign a notarized statement. One roommate who travels for work can hold up an entire application. Find out who needs to sign before you start.",
  },
]

const FAQS = [
  {
    q: "How long does a NYC gun license take?",
    a: "Roughly six months is typical from a complete submission to the decision letter. That covers the in-person interview, fingerprinting, the FBI background check, and the character investigation. The clock starts when your application is complete — not when you decide to apply.",
  },
  {
    q: "Can anyone make the NYPD go faster?",
    a: "No. The NYPD License Division keeps full investigative discretion over both the decision and the pace of it. Anyone who tells you they can move you up the line is telling you something that isn't true. What you can control is your side: filing a complete, accurate package the first time so there's nothing to send back.",
  },
  {
    q: "What's the most common reason applications take longer than six months?",
    a: "An incomplete package. A missing notarization or an unanswered question means a letter from the License Division and weeks of waiting for your reply. Every gap in your paperwork is time added to the end.",
  },
  {
    q: "When should I take the 18-hour training course?",
    a: "Not first. Your training certificate must be dated within six months of when you file, so if you take the course and then spend five months collecting references, the certificate can go stale before you submit. Line the course up with the back half of your prep.",
  },
  {
    q: "How long does the paperwork take to put together?",
    a: "It varies a lot, because most of it depends on other people — four references who need to visit a notary, the adults in your home, an instructor's class schedule. People who work at it steadily tend to measure this in weeks. People who start and stop tend to measure it in months.",
  },
  {
    q: "Does the six months include the time to get ready?",
    a: "No. The six months is the NYPD's side, starting from a complete submission. Your prep time comes before that and is entirely separate — which is the good news, since it's the half you can actually do something about.",
  },
]

export default function TimelinePage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Timeline", path: "/timeline" }]} />
      <PageHero
        eyebrow="How long it takes"
        title="How long does a NYC gun license take?"
        subtitle="About six months on the NYPD's side — plus however long you take to get ready. Here's where the time actually goes."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A NYC gun license takes <strong>roughly six months</strong> from a complete submission to
          the decision letter — covering the interview, fingerprinting, the FBI background check,
          and the character investigation. The clock starts when your application is complete, not
          when you decide to apply, so the time you spend getting your paperwork right comes on top
          of that. Nobody can make the NYPD move faster; the only half of the calendar anyone can
          control is your own.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Stage by stage</h2>
        <p className="mt-3 text-text-mid">
          Two clocks run here, not one. The first is yours and starts today. The second is the
          NYPD&apos;s and doesn&apos;t start until your file is complete.
        </p>
        <ol className="mt-6 space-y-3">
          {STAGES.map((s, i) => (
            <li key={s.stage} className="rounded-xl border border-hairline bg-card p-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-signal">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display font-semibold text-text-hi">{s.stage}</h3>
              </div>
              <p className="mt-1 pl-9 text-xs uppercase tracking-wide text-text-low">{s.when}</p>
              <p className="mt-2 pl-9 text-text-mid">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What actually causes delays
        </h2>
        <p className="mt-3 text-text-mid">
          Almost every application that runs long runs long for one of these four reasons. All four
          happen before you file — which means all four are fixable.
        </p>
        <div className="mt-6 space-y-3">
          {DELAYS.map((d) => (
            <div key={d.title} className="rounded-xl border border-hairline bg-card p-5">
              <h3 className="font-display font-semibold text-text-hi">{d.title}</h3>
              <p className="mt-2 text-text-mid">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          The honest part: the wait is the wait
        </h2>
        <p className="mt-3 text-text-mid">
          We won&apos;t pretend otherwise. The License Division decides on its own schedule, and no
          consultant, course, or fee changes that. What a good process does is make sure the six
          months is six months — not six months plus three rounds of letters asking for the thing
          you forgot. Here are the rules behind all of it, with sources:
        </p>
        <FactList
          facts={[FACTS.timeline, FACTS.trainingClock, FACTS.discretion, FACTS.youFile]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            The fastest thing you can do today is find out where you stand.
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
          { label: "How the process works, step by step", href: "/how-it-works" },
          { label: "Common questions", href: "/faq" },
        ]}
      />
    </>
  )
}
