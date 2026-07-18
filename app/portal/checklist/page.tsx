import { CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { actionFor } from "@/lib/requirements/actions"
import { questionnaireFor, prefillFor, type PrefillContext } from "@/lib/requirements/questionnaires"
import type { WizardAnswers } from "@/lib/intake/answers"
import type { GeneratedDoc } from "@/components/portal/requirement-action"
import { getCaseRequirements } from "@/lib/requirements"
import {
  RequirementsChecklist,
  type ReqChecklistItem,
} from "@/components/portal/requirements-checklist"

export const metadata = { title: "Your checklist" }

export default async function ChecklistPage() {
  const myCase = await getMyCase()
  if (!myCase) return <NoCase />

  const supabase = await createClient()

  // V3-P2.1 — ONE source of truth: the versioned requirements engine. Every
  // case has case_requirements (materialized at creation and after intake);
  // the V1 checklist_items fallback is gone.
  const [reqRows, { data: intake }, { data: savedAnswers }, { data: genDocs }, { data: sig }] = await Promise.all([
    getCaseRequirements(supabase, myCase.id),
    supabase.from("intake_sessions").select("completed_at, answers").eq("case_id", myCase.id).maybeSingle(),
    supabase.from("requirement_answers").select("req_code, answers").eq("case_id", myCase.id),
    supabase
      .from("documents")
      .select("id, req_code, file_name, file_path, created_at, signed_at")
      .eq("case_id", myCase.id)
      .eq("generated", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("signatures")
      .select("png_base64")
      .eq("case_id", myCase.id)
      .eq("signer_key", "applicant")
      .maybeSingle(),
  ])
  const intakeDone = !!intake?.completed_at

  // Questionnaire starting values: intake first, then anything already saved for
  // that requirement (so an edit round-trips instead of resetting).
  const intakeAnswers = (intake?.answers ?? {}) as unknown as WizardAnswers
  const prefillCtx: PrefillContext = {
    intake: intakeAnswers,
    clientName: myCase.client.full_name,
    borough: myCase.client.borough,
    zip: myCase.client.zip,
  }
  const savedByCode = new Map((savedAnswers ?? []).map((r) => [r.req_code, r.answers as Record<string, unknown>]))
  const prefills: Record<string, Record<string, unknown>> = {}
  for (const row of reqRows) {
    const a = actionFor(row.req_code)
    if (a?.mode !== "generate" || !a.questionnaireId) continue
    const q = questionnaireFor(a.questionnaireId)
    if (!q) continue
    prefills[row.req_code] = { ...prefillFor(q, prefillCtx), ...(savedByCode.get(row.req_code) ?? {}) }
  }

  // Latest generated document per requirement, with a short-lived signed URL.
  const generated: Record<string, GeneratedDoc> = {}
  for (const d of genDocs ?? []) {
    if (!d.req_code || generated[d.req_code]) continue
    let url: string | null = null
    if (d.file_path) {
      const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 3600)
      url = data?.signedUrl ?? null
    }
    generated[d.req_code] = { id: d.id, fileName: d.file_name, url, signedAt: d.signed_at }
  }

  const items: ReqChecklistItem[] = reqRows.map((row) => {
    const req = row.requirement
    return {
      id: row.id,
      reqCode: row.req_code,
      status: row.status,
      title: req?.title ?? row.req_code,
      description: req?.description ?? null,
      authority: req?.authority ?? null,
      severity: req?.severity ?? "high",
      documentType: req?.document_type ?? null,
    }
  })
  return (
    <div>
      <Header intakeDone={intakeDone} />
      <RequirementsChecklist
        items={items}
        caseId={myCase.id}
        clientId={myCase.client.id}
        prefills={prefills}
        generated={generated}
        signatureOnFile={sig?.png_base64 ?? null}
      />
    </div>
  )
}

function Header({ intakeDone }: { intakeDone: boolean }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">Your checklist</h1>
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
            Upload documents under the Documents tab. We&apos;ll mark each item off as it comes in.
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          The actions we need from you right now. Upload documents under the Documents tab.
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
