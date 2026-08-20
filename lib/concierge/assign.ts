import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { logActivity } from "@/lib/activity"

type DB = SupabaseClient<Database>

/**
 * CONCIERGE QA Phase 9 — when a concierge case is paid, make sure it has an agent.
 * Assigns the LEAST-LOADED is_concierge_agent (fewest currently-assigned clients),
 * so paid concierge buyers don't sit "Unassigned" while their dashboard invites
 * them to "message your concierge". No-op if the case isn't concierge, is already
 * assigned, or no agents are configured (left for manual assignment). Idempotent.
 */
export async function autoAssignConciergeAgent(db: DB, caseId: string): Promise<void> {
  const { data: kase } = await db
    .from("cases")
    .select("service_mode, client_id, clients(assigned_staff)")
    .eq("id", caseId)
    .maybeSingle()
  if (!kase || kase.service_mode !== "concierge") return
  const client = kase.clients as unknown as { assigned_staff: string | null } | null
  if (client?.assigned_staff) return // already has an agent

  const { data: agents } = await db.from("profiles").select("id").eq("is_concierge_agent", true)
  const agentIds = (agents ?? []).map((a) => a.id)
  if (agentIds.length === 0) return // no agents → leave for manual assignment

  // Least-loaded across the agents.
  const { data: loads } = await db.from("clients").select("assigned_staff").in("assigned_staff", agentIds)
  const count = new Map<string, number>(agentIds.map((id) => [id, 0]))
  for (const l of loads ?? []) {
    if (l.assigned_staff) count.set(l.assigned_staff, (count.get(l.assigned_staff) ?? 0) + 1)
  }
  const chosen = agentIds.reduce(
    (best, id) => ((count.get(id) ?? 0) < (count.get(best) ?? 0) ? id : best),
    agentIds[0]
  )

  await db.from("clients").update({ assigned_staff: chosen }).eq("id", kase.client_id)
  await logActivity({
    action: "concierge.agent_assigned",
    caseId,
    clientId: kase.client_id,
    entity: "client",
    entityId: kase.client_id,
    detail: { agent: chosen, auto: true },
  })
}
