import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { EligibilityQuiz } from "@/components/marketing/eligibility-quiz"

export const metadata = buildMetadata({
  title: "NYC Gun License Eligibility Check",
  description:
    "Find out in two minutes whether you likely qualify for a NYC gun license. No payment, no account — just an honest read on where you stand.",
  path: "/eligibility",
})

export default function Eligibility() {
  return (
    <>
      <PageHero
        eyebrow="Eligibility"
        title="Do you qualify?"
        subtitle="Six quick questions. No payment, no commitment — just a clear read on where you stand."
      />
      <section className="section eligibility-page-stage">
        <div className="shell eligibility-stage-shell">
          <EligibilityQuiz />
        </div>
      </section>
    </>
  )
}
