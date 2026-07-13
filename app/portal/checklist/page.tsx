import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
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
  const reqRows = await getCaseRequirements(supabase, myCase.id)

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
      <Header />
      <RequirementsChecklist items={items} />
    </div>
  )
}

function Header() {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">Your checklist</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The actions we need from you right now. Upload documents under the Documents tab.
      </p>
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
