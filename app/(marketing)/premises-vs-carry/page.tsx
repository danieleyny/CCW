import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Premises vs Carry License in NYC",
  description:
    "The difference between a NYC premises license and a carry license — where each lets you keep or carry a handgun, and which one fits how you actually want to be licensed.",
  path: "/premises-vs-carry",
})

/**
 * License-types explainer. Every legal claim renders from the sourced,
 * attorney-approved fact base (content/facts.ts) — the distinction is stated at
 * the level NY Penal Law §400.00(2) supports; it does not enumerate NYC-specific
 * type names that could not be verified against a primary source.
 */
const FAQS = [
  {
    q: "What is the difference between a premises and a carry license in NYC?",
    a: "A premises license lets you possess a handgun at a specified location — a home or a place of business. A carry license lets you carry a handgun concealed. An unrestricted carry license permits concealed carry without regard to your job or a particular place. They are different licenses with different standards.",
  },
  {
    q: "Can I carry my handgun with a premises license?",
    a: "No. A premises license covers possession at the licensed location. It does not authorize carrying the handgun around in public. New York allows only limited lawful transport — for example, directly to and from an authorized range — under its transport rules.",
  },
  {
    q: "Which license should I apply for?",
    a: "That depends on what you actually need — keeping a firearm at home or at a business, versus carrying one. The application, standards, and investigation are set by the NYPD License Division, which keeps full discretion over the decision. If you're unsure which fits your situation, that's a good question for a licensed attorney.",
  },
  {
    q: "Is the process different for a premises versus a carry license?",
    a: "Both go through the same NYPD License Division and share the core requirements — training, references, the investigation, and the interview. What differs is the license type you apply for and what it authorizes once issued.",
  },
]

export default function PremisesVsCarryPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Premises vs carry", path: "/premises-vs-carry" }]} />
      <PageHero
        eyebrow="License types"
        title="Premises vs carry: which NYC license is which"
        subtitle="Two different licenses, two different things they let you do. Here's the distinction in plain terms — sourced to the statute that sets it."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          In New York, a <strong>premises license</strong> lets you possess a handgun at a specific
          location — your home or your place of business — while a <strong>carry license</strong> lets
          you carry a handgun concealed. A premises license does <strong>not</strong> let you carry in
          public; a carry license does. Both go through the NYPD License Division, which sets the
          standards and keeps full discretion over the decision.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Same division, different license</h2>
        <p className="mt-3 text-text-mid">
          The most common mix-up we hear is treating &ldquo;a gun license&rdquo; as one thing. It
          isn&apos;t. What a license lets you do — keep a handgun at a fixed location, or carry one
          concealed — is written into the license type itself. Applying for the wrong one wastes the
          part of the calendar you actually control: the preparation before you file.
        </p>
        <p className="mt-3 text-text-mid">
          The rules below are set by New York State and the NYPD, not by us. Here are the primary
          sources:
        </p>
        <FactList facts={[FACTS.licenseTypes, FACTS.premisesScope, FACTS.discretion]} />
        <p className="mt-6 rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
          This page explains the general distinction. It is not legal advice about your situation. If
          you&apos;re weighing which license to pursue, or your circumstances are unusual,{" "}
          <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
            talk to a licensed attorney
          </Link>
          .
        </p>
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">Not sure which one fits? Start with a two-minute eligibility check.</p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What it costs, all-in", href: "/cost" },
          { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
          { label: "Non-residents & business licenses", href: "/non-resident-business" },
        ]}
      />
    </>
  )
}
