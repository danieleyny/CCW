import { CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { RequirementsChecklist } from "@/components/portal/requirements-checklist"

export const metadata = { title: "Your checklist" }

export default async function ChecklistPage() {
  const myCase = await getMyCase()
  if (!myCase) return <NoCase />

  // V3-P2.1 — ONE source of truth: the versioned requirements engine, loaded by
  // the same function /portal/documents uses so the two views cannot disagree.
  const supabase = await createClient()
  const view = await loadRequirementView(supabase, myCase)

  return (
    <div>
      <Header intakeDone={view.intakeDone} />
      <RequirementsChecklist
        items={view.items}
        caseId={myCase.id}
        clientId={myCase.client.id}
        prefills={view.prefills}
        generated={view.generated}
        currentByReq={view.currentByReq}
        referenceProgress={view.referenceProgress}
        signatureOnFile={view.signatureOnFile}
        feeSummary={view.feeSummary}
        feeReceipts={view.feeReceipts}
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
