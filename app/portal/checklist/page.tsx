import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { stageIndex, type CaseStageKey } from "@/config/stages"
import { ClientChecklist, type ClientChecklistItem } from "@/components/portal/client-checklist"

export const metadata = { title: "Your checklist" }

export default async function ChecklistPage() {
  const myCase = await getMyCase()
  if (!myCase) return <NoCase />

  const here = stageIndex(myCase.stage as CaseStageKey)
  const supabase = await createClient()
  const { data } = await supabase
    .from("checklist_items")
    .select("id, title, description, status, document_type, stage, owner")
    .eq("case_id", myCase.id)
    .eq("owner", "client")

  // Only show what's relevant now: items up to and including the current stage.
  const items = (data ?? []).filter(
    (i) => stageIndex(i.stage as CaseStageKey) <= here
  ) as ClientChecklistItem[]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Your checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The actions we need from you right now. Upload documents under the Documents tab.
        </p>
      </div>
      <ClientChecklist caseId={myCase.id} items={items} />
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
