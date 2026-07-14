import Link from "next/link"
import { CASE_STAGES } from "@/config/stages"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { RequirementsWall } from "@/components/marketing/showcase/requirements-wall"
import { RefilePromise } from "@/components/marketing/refile-promise"

export const metadata = {
  title: "How it works",
  description:
    "The NYC concealed carry process in 13 precise stages — eligibility, training, documents, notarization, filing, investigation, and licensure.",
}

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="The Process"
        title="Thirteen stages, executed end to end"
        subtitle="NYC is among the most demanding jurisdictions in the country. Here's exactly how we move your application from inquiry to licensed."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <ol className="relative space-y-3 border-l border-hairline pl-6">
          {CASE_STAGES.map((s) => (
            <li key={s.key} className="relative">
              <span className="absolute -left-[31px] top-1.5 flex size-3 items-center justify-center">
                <span className="size-2 rounded-full bg-brass shadow-[0_0_8px_var(--brass-glow)]" />
              </span>
              <div className="rounded-lg border border-hairline bg-card p-5">
                <div className="engraved text-brass">Stage {String(s.order).padStart(2, "0")}</div>
                <div className="mt-1 font-display text-lg font-semibold">{s.label}</div>
                <p className="mt-1 text-sm text-text-mid">{s.description}</p>
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
