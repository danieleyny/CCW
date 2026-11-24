import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { getActivePackagesForBrand, hasPaidPackage } from "@/lib/packages"
import { accessCodesEnabled } from "@/lib/access-codes"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { ChoosePathCards } from "@/components/portal/choose-path-cards"
import { PortalPageHeader } from "@/components/portal/ui/portal-page-header"
import { SetupStepper } from "@/components/portal/ui/setup-stepper"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import type { ApplicationType } from "@/lib/application-types"
import { getMessages } from "@/lib/i18n"
import type { BrandKey } from "@/config/brands"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.choosePath.metadataTitle }
}

/**
 * CONCIERGE Phase 1 — the post-intake fork. Everyone completes intake the same
 * way; here they choose the EXPERIENCE (Self-Guided vs Full Concierge). Selecting
 * one records `service_mode` and hands off to checkout. Already-paid applicants
 * are sent to the surface they bought.
 */
export default async function ChoosePathPage() {
  const [myCase, t] = await Promise.all([getMyCase(), getMessages()])
  if (!myCase) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">{t.common.almostThere}</h1>
        <p className="mt-2 text-sm text-text-mid">
          {t.common.noCase}
        </p>
      </div>
    )
  }
  if (!myCase.application_type) redirect("/portal/license-path")

  const supabase = await createClient()

  // Already paid? Don't sell again — route to what they bought.
  const [paidConcierge, paidSelf] = await Promise.all([
    hasPaidPackage(supabase, myCase.id, "full_concierge"),
    hasPaidPackage(supabase, myCase.id, "self_guided"),
  ])
  if (paidConcierge) redirect("/portal/concierge")
  if (paidSelf) redirect("/portal")

  const packages = await getActivePackagesForBrand(supabase, myCase.brand as BrandKey)
  if (packages.length === 1) redirect(`/portal/enroll?package=${packages[0].key}`)
  const alreadyMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  const codesEnabled = accessCodesEnabled()
  // QA Phase 9 — don't attribute a STAFF-set path to the applicant.
  const { data: clientRow } = await supabase
    .from("clients")
    .select("lead_source")
    .eq("id", myCase.client_id)
    .maybeSingle()
  const staffProvisioned = clientRow?.lead_source === "admin_manual"
  const feeNote = `${t.choosePath.feeNote}${
    STRIPE_ENABLED
      ? ""
      : t.choosePath.feeNoteInvoice
  }`

  return (
    <div className="portal-plan-page">
      <ScrollToTop />
      <PortalPageHeader
        title={t.choosePath.title}
        lede={
          <>
            {t.choosePath.ledePrefix} <strong>{t.choosePath.selfGuided}</strong>{" "}
            {t.choosePath.selfGuidedShort} <strong>{t.choosePath.concierge}</strong>{" "}
            {t.choosePath.conciergeShort}
          </>
        }
        stepper={<SetupStepper current={2} finalLabel={t.setup.getStarted} />}
      />

      <ChoosePathCards
        packages={packages}
        alreadyMode={alreadyMode}
        staffProvisioned={staffProvisioned}
        codesEnabled={codesEnabled}
        applicationType={myCase.application_type as ApplicationType}
        stripeEnabled={STRIPE_ENABLED}
        feeNote={feeNote}
      />
    </div>
  )
}
