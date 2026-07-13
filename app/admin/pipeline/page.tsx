import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { PipelineBoard, type PipelineCase } from "@/components/admin/pipeline-board"
import { daysSince } from "@/lib/format"
import type { CaseStageKey } from "@/config/stages"

export const metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, stage, status, is_renewal, stage_entered_at, updated_at, clients(full_name, borough)")
    .order("created_at", { ascending: false })

  // V3-P2.5 — blocking counts for the stall signal, one query for the board.
  const ids = (data ?? []).map((c) => c.id)
  const blockingByCase = new Map<string, number>()
  if (ids.length) {
    const { data: reqs } = await supabase
      .from("case_requirements")
      .select("case_id, requirements!inner(blocking)")
      .in("case_id", ids)
      .eq("status", "pending")
    for (const r of reqs ?? []) {
      if ((r.requirements as unknown as { blocking: boolean })?.blocking) {
        blockingByCase.set(r.case_id, (blockingByCase.get(r.case_id) ?? 0) + 1)
      }
    }
  }

  const cases: PipelineCase[] = (data ?? []).map((c) => {
    const client = c.clients as unknown as { full_name: string; borough: string | null }
    return {
      id: c.id,
      stage: c.stage as CaseStageKey,
      status: c.status,
      isRenewal: c.is_renewal,
      clientName: client?.full_name ?? "Unknown",
      borough: client?.borough ?? null,
      daysInStage: daysSince(c.stage_entered_at ?? c.updated_at) ?? 0,
      blockingCount: blockingByCase.get(c.id) ?? 0,
    }
  })

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag a case across the 13 stages. Red edge = stalled past 14 days or blocked; assembly/filing are gated by pre-filing QA."
      />
      <PipelineBoard initialCases={cases} />
    </div>
  )
}
