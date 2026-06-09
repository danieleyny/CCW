import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { PipelineBoard, type PipelineCase } from "@/components/admin/pipeline-board"
import type { CaseStageKey } from "@/config/stages"

export const metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, stage, status, is_renewal, clients(full_name, borough)")
    .order("created_at", { ascending: false })

  const cases: PipelineCase[] = (data ?? []).map((c) => {
    const client = c.clients as unknown as { full_name: string; borough: string | null }
    return {
      id: c.id,
      stage: c.stage as CaseStageKey,
      status: c.status,
      isRenewal: c.is_renewal,
      clientName: client?.full_name ?? "Unknown",
      borough: client?.borough ?? null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag a case across the 13 stages to advance it. Clients are notified on each move."
      />
      <PipelineBoard initialCases={cases} />
    </div>
  )
}
