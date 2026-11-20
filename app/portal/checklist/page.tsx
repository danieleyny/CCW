import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { computePortalReadiness } from "@/lib/disclosures/readiness"
import { pendingConversionReqCodes } from "@/lib/requirements/photo-conversion"
import { portalTrackForCase } from "@/config/portal-steps"
import { RequirementsChecklist } from "@/components/portal/requirements-checklist"
import { DeepLinkHighlight } from "@/components/portal/concierge/deep-link-highlight"
import { getMessages } from "@/lib/i18n"
import { computeNextStep } from "@/lib/portal/next-step"
import { actionFor } from "@/lib/requirements/actions"
import type { CaseStageKey } from "@/config/stages"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.checklistTitle }
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string | string[]; section?: string | string[] }>
}) {
  const [myCase, messages] = await Promise.all([getMyCase(), getMessages()])
  if (!myCase) return <NoCase message={messages.common.noCase} />

  // V3-P2.1 — ONE source of truth: the versioned requirements engine, loaded by
  // the same function /portal/documents uses so the two views cannot disagree.
  const supabase = await createClient()
  // For a concierge case, /portal/concierge is home — there is no separate checklist.
  // Land them on the vault WITH a one-time explanation (P1.3) rather than a silent
  // bounce, so arriving from a stale link or bookmark makes sense.
  if (myCase.service_mode === "concierge") redirect("/portal/concierge?from=checklist")
  const view = await loadRequirementView(supabase, myCase)
  // A sponsored case always carries party='sponsor' packet items — so if any item is
  // sponsor-managed, the case is sponsored. Used to lock the employer's Letter-of-
  // Necessity fields (statements 1/3/5) read-only for the applicant.
  const caseSponsored = view.items.some((i) => i.sponsorManaged)
  // Licence track scopes the Letter-of-Necessity statements (a Concealed Carry
  // applicant is asked 3 of them, not 6).
  const { data: trackRow } = await supabase.from("cases").select("license_track, clients:client_id(track)").eq("id", myCase.id).maybeSingle()
  const portalTrack = portalTrackForCase({
    licenseTrack: trackRow?.license_track ?? null,
    clientTrack: (trackRow?.clients as unknown as { track?: string | null } | null)?.track ?? null,
  })

  // Two-gate portal readiness (ready to enter · ready to finalize). Admin: assembles
  // the applicant's own data for the summary (mirrors the signed record).
  const admin = createAdminClient()
  const [assembled, { data: dscRow }, conversionPendingReqCodes] = await Promise.all([
    assembleApplicationValues(admin, myCase.id),
    admin.from("requirement_answers").select("answers").eq("case_id", myCase.id).eq("req_code", "DSC-01").maybeSingle(),
    pendingConversionReqCodes(admin, myCase.id),
  ])
  const readiness = assembled
    ? computePortalReadiness(
        assembled.values,
        (dscRow?.answers ?? {}) as Record<string, unknown>,
        view.items.map((i) => ({ reqCode: i.reqCode, status: i.status })),
        {
          portalTrack,
          signedRecordSatisfied: view.items.find((i) => i.reqCode === "DSC-01")?.status === "satisfied",
          conversionPendingReqCodes,
        }
      )
    : null

  const query = await searchParams
  const requestedItem = typeof query.item === "string" ? query.item : null
  const requestedSection = typeof query.section === "string" ? query.section : null
  const homeNextStep = computeNextStep({
    items: view.items,
    intakeDone: view.intakeDone,
    stage: myCase.stage as CaseStageKey,
  })
  const homeNextItem = view.items.find(
    (item) => (actionFor(item.reqCode)?.customerTitle ?? item.title) === homeNextStep.title
  )

  return (
    <div>
      <DeepLinkHighlight />
      <RequirementsChecklist
        items={view.items}
        intakeDone={view.intakeDone}
        readiness={readiness}
        initialItem={requestedItem ?? homeNextItem?.reqCode ?? null}
        initialSection={requestedSection}
        caseId={myCase.id}
        clientId={myCase.client.id}
        prefills={view.prefills}
        generated={view.generated}
        currentByReq={view.currentByReq}
        referenceProgress={view.referenceProgress}
        cohabitantProgress={view.cohabitantProgress}
        dmvApplicant={view.dmvApplicant}
        signatureOnFile={view.signatureOnFile}
        feeSummary={view.feeSummary}
        feeReceipts={view.feeReceipts}
        caseSponsored={caseSponsored}
        licenseTrack={trackRow?.license_track ?? null}
        isConcierge={false}
      />
    </div>
  )
}

function NoCase({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}
