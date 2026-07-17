import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "NYC Gun License Renewal",
  description:
    "A NYC carry license runs a three-year term, and New York requires recertification on the State's schedule. What renewal involves, and how to not miss the date.",
  path: "/renewal",
})

/**
 * Renewal. The temptation on a page like this is to invent the mechanics —
 * filing windows, lapse consequences, renewal fee amounts. None of those are in
 * content/facts.ts, so none of them are here. What IS sourced: the three-year
 * term, the State recertification duty, and the storage rules that apply once
 * you're licensed. Everything else on the page is about our own process.
 */

const DIFFERENCES = [
  {
    title: "You have a track record now",
    body: "The first time, the License Division was meeting you cold. Now there's a file. That doesn't make renewal automatic — the NYPD keeps its discretion — but you're no longer starting from a blank page.",
  },
  {
    title: "Your life has changed since then",
    body: "Three years is long enough to move, change jobs, gain a roommate, or have something happen that has to be disclosed. The people who get caught out at renewal are the ones who assumed nothing had changed and didn't check.",
  },
  {
    title: "Two obligations, not one",
    body: "Your NYC license has its own term, and New York State runs recertification on its own schedule. They're separate duties with separate dates. Tracking one and forgetting the other is a very easy mistake to make.",
  },
  {
    title: "The paperwork is familiar",
    body: "You've done a version of this before, which makes it feel smaller than it is — and that's exactly why people start it too late. Familiar isn't the same as fast.",
  },
]

const FAQS = [
  {
    q: "How often does a NYC gun license need to be renewed?",
    a: "A NYC carry license is issued for a three-year term. Separately, New York State requires firearms recertification on its own schedule. Those are two different dates and both matter — the NYC term is set by the NYPD License Division, and recertification runs through the State Police.",
  },
  {
    q: "What's the difference between renewal and recertification?",
    a: "Renewal is about your NYC license and its three-year term, handled by the NYPD License Division. Recertification is a New York State requirement that runs on the State's schedule, through the State Police. Doing one does not do the other.",
  },
  {
    q: "How is renewal different from a first application?",
    a: "The big difference is that you already have a file with the License Division and you've been through the process once. The catch is that three years is long enough for real things to change — an address, a household, a job, a disclosure — and those changes have to be accounted for rather than assumed away.",
  },
  {
    q: "What happens if I miss the date?",
    a: "Don't find out. The reason recertification exists is to keep your license from lapsing, and a lapse is a much bigger problem to solve than a calendar reminder is to set. If your date is close and you're unsure where you stand, talk to us before it passes, not after.",
  },
  {
    q: "Do the storage rules still apply between renewals?",
    a: "Yes. New York's safe-storage rules apply for as long as you're licensed — they aren't a one-time hurdle you clear at the application and forget. They're an ongoing obligation.",
  },
  {
    q: "Can you remind me when my renewal is due?",
    a: "That's exactly what we do. If you're a client, your term and recertification dates live in your portal and we track them for you, so the date reaches you well before it's urgent. You still handle your own filing — we make sure you're not surprised by the calendar.",
  },
]

export default function RenewalPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Renewal", path: "/renewal" }]} />
      <PageHero
        eyebrow="Keeping it current"
        title="NYC gun license renewal"
        subtitle="Two dates, three years apart, and no one sends you a reminder. Here's what renewal actually involves."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A NYC carry license is issued for a <strong>three-year term</strong>, and separately{" "}
          <strong>New York requires firearms recertification on the State&apos;s schedule</strong> to
          keep your license from lapsing. Those are two different obligations with two different
          dates, and both are on you to track. Renewal is far easier than a first application — as
          long as you start it before the date, not after.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The two clocks</h2>
        <p className="mt-3 text-text-mid">
          Almost everything that goes wrong with renewal is a calendar problem, not a paperwork
          problem. Here&apos;s what sets each clock, with sources:
        </p>
        <FactList facts={[FACTS.term, FACTS.recertification]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          How renewal differs from your first application
        </h2>
        <p className="mt-3 text-text-mid">
          Less of a mountain, more of a checkpoint — but a checkpoint you can still walk past
          without noticing.
        </p>
        <div className="mt-6 space-y-3">
          {DIFFERENCES.map((d) => (
            <div key={d.title} className="rounded-xl border border-hairline bg-card p-5">
              <h3 className="font-display font-semibold text-text-hi">{d.title}</h3>
              <p className="mt-2 text-text-mid">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          While the license is live
        </h2>
        <p className="mt-3 text-text-mid">
          Being licensed isn&apos;t the end of the obligations — it&apos;s the start of a different
          set of them. Storage is the one people underestimate, and it doesn&apos;t pause between
          renewals.
        </p>
        <FactList facts={[FACTS.storage]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">We watch the dates</h2>
        <p className="mt-3 text-text-mid">
          Nobody calls to tell you your term is running out. So we keep your term and
          recertification dates in your portal and reach out ahead of them — early enough that
          renewal is a task on a Tuesday instead of an emergency. You still file your own paperwork,
          the same as you did the first time. What you don&apos;t do is find out late.
        </p>
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Renewing, or applying for the first time? Start in the same place.
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "How the process works, step by step", href: "/how-it-works" },
          { label: "What a NYC gun license costs", href: "/cost" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Official sources and forms", href: "/resources" },
        ]}
      />
    </>
  )
}
