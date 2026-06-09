import Link from "next/link"
import { CASE_STAGES } from "@/config/stages"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = {
  title: "How it works",
  description:
    "The NYC concealed carry process in 13 precise stages — eligibility, training, documents, notarization, filing, investigation, and licensure.",
}

const REQUIREMENTS = [
  "Valid government photo ID (license, non-driver ID, or passport)",
  "Four notarized character references (2 may be family; 2 unrelated, non-law-enforcement)",
  "Notarized cohabitant affidavit for every adult 18+ in your home",
  "List of all social media accounts for the past 3 years",
  "Proof of the 16-hour + 2-hour CCIA training",
  "Two color photos of your gun safe — one door open, one closed",
  "Proof of NYC residence or place of business",
]

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

      <section className="border-t border-hairline bg-surface-1/30">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <SectionEyebrow>What you&apos;ll need</SectionEyebrow>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            The documents that trip most people up
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {REQUIREMENTS.map((r) => (
              <li
                key={r}
                className="flex gap-3 rounded-lg border border-hairline bg-card p-4 text-sm"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-signal" />
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/eligibility">Check your eligibility</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
