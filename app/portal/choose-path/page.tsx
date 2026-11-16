import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { getActivePackages, hasPaidPackage } from "@/lib/packages"
import { accessCodesEnabled } from "@/lib/access-codes"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { ChoosePathCards } from "@/components/portal/choose-path-cards"
import { PortalPageHeader } from "@/components/portal/ui/portal-page-header"
import { SetupStepper } from "@/components/portal/ui/setup-stepper"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import type { ApplicationType } from "@/lib/application-types"

export const metadata = { title: "Choose how we'll work together" }

/**
 * CONCIERGE Phase 1 — the post-intake fork. Everyone completes intake the same
 * way; here they choose the EXPERIENCE (Self-Guided vs Full Concierge). Selecting
 * one records `service_mode` and hands off to checkout. Already-paid applicants
 * are sent to the surface they bought.
 */
export default async function ChoosePathPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Almost there.</h1>
        <p className="mt-2 text-sm text-text-mid">
          Your case isn&apos;t set up yet. Your concierge will reach out shortly to get you started.
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

  const packages = await getActivePackages(supabase)
  const alreadyMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  const codesEnabled = accessCodesEnabled()
  // QA Phase 9 — don't attribute a STAFF-set path to the applicant.
  const { data: clientRow } = await supabase
    .from("clients")
    .select("lead_source")
    .eq("id", myCase.client_id)
    .maybeSingle()
  const staffProvisioned = clientRow?.lead_source === "admin_manual"
  const feeNote = `Service fees only — the NYPD's application fee and the fingerprint fee are paid at filing and never collected by us. You can switch plans anytime before you pay.${
    STRIPE_ENABLED
      ? ""
      : " Card checkout is being finalized — choosing a plan records it instantly and we email your invoice within one business day."
  }`

  return (
    <div className="portal-plan-page">
      <ScrollToTop />
      <PortalPageHeader
        title="How would you like to work together?"
        lede={
          <>
            Same finish line, two ways there. <strong>Self-Guided:</strong> you submit your own
            application. <strong>Full Concierge:</strong> we prepare and quality-check it with you;
            you review and submit.
          </>
        }
        stepper={<SetupStepper current={2} finalLabel="Get started" />}
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
