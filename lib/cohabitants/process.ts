/** Cohabitant-flow helpers (no `server-only` so scripts can drive them). */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/**
 * Where a cohabitant stands on the invite journey — the SAME five states the
 * reference tracker shows, so both rosters read identically everywhere
 * (checklist progress panel, /portal/people, admin People tab).
 *
 * Derived, never stored: the milestones are timestamps on the row and
 * affidavit_status stays the not_started → received → notarized machine other
 * code keys on. Legacy rows invited before sent_at existed still derive
 * "invited" from token presence.
 */
export type CohabitantLinkState = "not_invited" | "invited" | "opened" | "submitted" | "notarized"

export function cohabitantState(c: {
  affidavit_status: Database["public"]["Enums"]["cohabitant_status"] | null
  token?: string | null
  token_revoked_at?: string | null
  opened_at?: string | null
}): CohabitantLinkState {
  if (c.affidavit_status === "notarized") return "notarized"
  if (c.affidavit_status === "received") return "submitted"
  const active = !!c.token && !c.token_revoked_at
  if (active && c.opened_at) return "opened"
  if (active) return "invited"
  return "not_invited"
}

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
