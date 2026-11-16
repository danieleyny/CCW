import { getMyCase } from "@/lib/portal"
import type { ApplicationType } from "@/lib/application-types"
import {
  ApplicationTypeCards,
  StaffAssistedApplicationTypes,
} from "@/components/portal/application-type-cards"
import { PortalPageHeader } from "@/components/portal/ui/portal-page-header"
import { SetupStepper } from "@/components/portal/ui/setup-stepper"
import { ScrollToTop } from "@/components/shared/scroll-to-top"

export const metadata = { title: "Choose your license path" }

export default async function LicensePathPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <div className="portal-no-case">
        <h1 className="portal-t-card">Almost there.</h1>
        <p className="mt-2 text-sm text-text-mid">
          Your case isn&apos;t set up yet. Please sign out and sign in again, or contact us for help.
        </p>
      </div>
    )
  }

  return (
    <div className="portal-license-page">
      <ScrollToTop />
      <PortalPageHeader
        title="What should your license let you do?"
        lede="This sets your training, references and checklist."
        stepper={<SetupStepper current={1} />}
      />

      <ApplicationTypeCards current={(myCase.application_type as ApplicationType | null) ?? null} />
      <aside className="portal-license-aside">
        <StaffAssistedApplicationTypes />
        <p className="portal-legal-note">
          Process guidance, not legal advice. The NYPD makes the licensing decision, and you always
          review and submit your own application. Not sure which fits? Ask your concierge before
          choosing.
        </p>
      </aside>
    </div>
  )
}
