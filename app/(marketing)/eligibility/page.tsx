import { buildMetadata } from "@/lib/seo"
import { EligibilityExperience } from "@/components/marketing/eligibility-quiz"

export const metadata = buildMetadata({
  title: "NYC Gun License Eligibility Check",
  description:
    "Find out in two minutes whether you likely qualify for a NYC gun license. No payment, no account — just an honest read on where you stand.",
  path: "/eligibility",
})

export default function Eligibility() {
  return <EligibilityExperience />
}
