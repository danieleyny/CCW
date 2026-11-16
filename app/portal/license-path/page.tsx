import { getMyCase } from "@/lib/portal"
import type { ApplicationType } from "@/lib/application-types"
import {
  ApplicationTypeCards,
  StaffAssistedApplicationTypes,
} from "@/components/portal/application-type-cards"
import { PortalPageHeader } from "@/components/portal/ui/portal-page-header"
import { SetupStepper } from "@/components/portal/ui/setup-stepper"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { getLocale, getMessages } from "@/lib/i18n"

export const metadata = { title: "Choose your license path" }

export default async function LicensePathPage() {
  const [myCase, locale, t] = await Promise.all([getMyCase(), getLocale(), getMessages()])
  if (!myCase) {
    return (
      <div className="portal-no-case">
        <h1 className="portal-t-card">{t.common.almostThere}</h1>
        <p className="mt-2 text-sm text-text-mid">
          {t.common.noCase}
        </p>
      </div>
    )
  }

  return (
    <div className="portal-license-page">
      <ScrollToTop />
      <PortalPageHeader
        title={t.licensePath.title}
        lede={t.licensePath.lede}
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
        {locale !== "en" ? <p className="portal-legal-note">{t.common.legalEnglishNotice}</p> : null}
      </aside>
    </div>
  )
}
