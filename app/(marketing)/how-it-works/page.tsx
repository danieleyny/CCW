import Link from "next/link"
import { CASE_STAGES } from "@/config/stages"
import { JOURNEY } from "@/content/journey"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { RequirementsWall } from "@/components/marketing/showcase/requirements-wall"
import { RefilePromise } from "@/components/marketing/refile-promise"

export const metadata = buildMetadata({
  title: "How to Get a Gun License in NYC",
  description:
    "The NYC gun license process end to end — eligibility, the 18-hour course, documents, notarization, filing, the investigation, and the interview.",
  path: "/how-it-works",
})

export default function HowItWorks() {
  return (
    <>
      {/* Copy note: this page renders content/journey.ts (the PUBLIC story), not
          config/stages.ts (the internal pipeline vocabulary). Staff say "Lead /
          Inquiry"; a nervous applicant should never have to. */}
      <PageHero
        eyebrow="How it works"
        title="How we get you ready to file, step by step"
        subtitle="New York's process is tough — which is exactly why having it handled matters. Here's the whole path, and what we do at each point so you don't have to."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <ol className="relative space-y-3 border-l border-hairline pl-6">
          {CASE_STAGES.map((s) => (
            <li key={s.key} className="relative">
              <span className="absolute -left-[31px] top-1.5 flex size-3 items-center justify-center">
                <span className="size-2 rounded-full bg-brass shadow-[0_0_8px_var(--brass-glow)]" />
              </span>
              <div className="rounded-lg border border-hairline bg-card p-5">
                <div className="engraved text-brass">Step {String(s.order).padStart(2, "0")}</div>
                <div className="mt-1 font-display text-lg font-semibold">{JOURNEY[s.key].label}</div>
                <p className="mt-1 text-sm text-text-mid">{JOURNEY[s.key].description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* V5 — the full 24-document citation wall lives here (relocated off the
          homepage, where it read as legalese homework). A motivated reader
          finds it and is impressed instead of exhausted. */}
      <RequirementsWall />

      {/* V5b — the Refile Promise, at the QA-gate payoff: this is the gate said
          out loud. Always beside brand.disclaimer. */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <RefilePromise />
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
