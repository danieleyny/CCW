import { PageHero } from "@/components/marketing/page-hero"
import { EligibilityQuiz } from "@/components/marketing/eligibility-quiz"

export const metadata = {
  title: "Eligibility Quiz",
  description:
    "Find out in two minutes whether you likely qualify for a NYC concealed carry license.",
}

export default function Eligibility() {
  return (
    <>
      <PageHero
        eyebrow="Eligibility"
        title="Do you qualify?"
        subtitle="Six quick questions. No payment, no commitment — just a clear read on where you stand."
      />
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EligibilityQuiz />
      </section>
    </>
  )
}
