import { getMyCase } from "@/lib/portal"
import type { ApplicationType } from "@/lib/application-types"
import {
  ApplicationTypeCards,
  StaffAssistedApplicationTypes,
} from "@/components/portal/application-type-cards"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ScrollToTop } from "@/components/shared/scroll-to-top"

export const metadata = { title: "Choose your licence path" }

export default async function LicensePathPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Almost there.</h1>
        <p className="mt-2 text-sm text-text-mid">Your case isn&apos;t set up yet. Please sign out and sign in again, or contact us for help.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ScrollToTop />
      <div className="max-w-2xl">
        <SectionEyebrow>Start with the right application</SectionEyebrow>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          What do you want your NYC handgun licence to let you do?
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-mid sm:text-base">
          This one choice changes your training, references and document checklist. Choose the goal that matches you; we&apos;ll build the workflow around it.
        </p>
      </div>

      <ApplicationTypeCards current={(myCase.application_type as ApplicationType | null) ?? null} />
      <StaffAssistedApplicationTypes />

      <div className="rounded-lg border border-hairline bg-surface-2/35 p-4 text-xs leading-5 text-text-low">
        This is process guidance, not legal advice. NYPD makes the licensing decision, and you always review and submit your own application. If your facts do not fit one option cleanly, ask your concierge before selecting.
      </div>
    </div>
  )
}
