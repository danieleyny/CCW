import { redirect } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { computePortalReadiness } from "@/lib/disclosures/readiness"
import { RequirementsChecklist } from "@/components/portal/requirements-checklist"
import { ReadinessCard } from "@/components/portal/readiness-card"

export const metadata = { title: "Your checklist" }

export default async function ChecklistPage() {
  const myCase = await getMyCase()
  if (!myCase) return <NoCase />

  // V3-P2.1 — ONE source of truth: the versioned requirements engine, loaded by
  // the same function /portal/documents uses so the two views cannot disagree.
  const supabase = await createClient()
  // For a concierge case, /portal/concierge is home — never a checklist dead end
  // (Part A). Send them there instead of showing an apologetic banner.
  if (myCase.service_mode === "concierge") redirect("/portal/concierge")
  const view = await loadRequirementView(supabase, myCase)
  // A sponsored case always carries party='sponsor' packet items — so if any item is
  // sponsor-managed, the case is sponsored. Used to lock the employer's Letter-of-
  // Necessity fields (statements 1/3/5) read-only for the applicant.
  const caseSponsored = view.items.some((i) => i.sponsorManaged)
  // Licence track scopes the Letter-of-Necessity statements (a Concealed Carry
  // applicant is asked 3 of them, not 6).
  const { data: trackRow } = await supabase.from("cases").select("license_track").eq("id", myCase.id).maybeSingle()

  // Two-gate portal readiness (ready to enter · ready to finalize). Admin: assembles
  // the applicant's own data for the summary (mirrors the signed record).
  const admin = createAdminClient()
  const assembled = await assembleApplicationValues(admin, myCase.id)
  const { data: dscRow } = await admin
    .from("requirement_answers")
    .select("answers")
    .eq("case_id", myCase.id)
    .eq("req_code", "DSC-01")
    .maybeSingle()
  const readiness = assembled
    ? computePortalReadiness(
        assembled.values,
        (dscRow?.answers ?? {}) as Record<string, unknown>,
        view.items.map((i) => ({ reqCode: i.reqCode, status: i.status })),
        {
          licenseTrack: assembled.track,
          signedRecordSatisfied: view.items.find((i) => i.reqCode === "DSC-01")?.status === "satisfied",
        }
      )
    : null

  return (
    <div>
      <Header intakeDone={view.intakeDone} />
      {readiness && <ReadinessCard readiness={readiness} />}
      <RequirementsChecklist
        items={view.items}
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

function Header({ intakeDone }: { intakeDone: boolean }) {
  return (
    <div className="mb-5">
      {/* Desktop heading — on mobile the sticky checklist header carries the title. */}
      <h1 className="hidden text-2xl font-semibold tracking-tight sm:block">Your checklist</h1>
      {intakeDone ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok/8 px-3 py-2 text-sm text-ok">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Intake complete — this is your personalized checklist. Each item finishes as you
              provide its document.
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the journey view: what&apos;s left and what to do next. Documents holds every
            file, needed and provided.
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          The actions we need from you right now. Documents holds every file, needed and provided.
        </p>
      )}
    </div>
  )
}

function NoCase() {
  return (
    <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
      Your case isn&apos;t set up yet.
    </p>
  )
}
