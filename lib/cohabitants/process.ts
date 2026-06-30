/** Cohabitant-flow helpers (no `server-only` so scripts can drive them). */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/**
 * Recompute COH-01 from cohabitant affidavit progress. Satisfied once every
 * cohabitant's affidavit is notarized. notes is the only signal an engaged
 * instructor can read (aggregate, never a name).
 */
export async function recomputeCohabitantRequirement(admin: DB, caseId: string) {
  const { data: cohabs } = await admin
    .from("cohabitants")
    .select("affidavit_status")
    .eq("case_id", caseId)
  const total = (cohabs ?? []).length
  if (total === 0) return { total: 0, notarized: 0 } // COH-01 stays N/A (lives alone)

  const notarized = (cohabs ?? []).filter((c) => c.affidavit_status === "notarized").length
  const status: Database["public"]["Enums"]["case_req_status"] = notarized >= total ? "satisfied" : "pending"

  await admin
    .from("case_requirements")
    .update({ status, notes: `${notarized}/${total} cohabitant affidavits notarized` })
    .eq("case_id", caseId)
    .eq("req_code", "COH-01")
    .in("status", ["pending", "satisfied"])

  return { total, notarized, status }
}
