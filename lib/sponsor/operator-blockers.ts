/**
 * Operator blockers for a sponsored Carry Guard case (3H). These are OUR
 * outstanding items — things the operator must confirm — represented as staff
 * `tasks` with an owner, never as applicant failures on a checklist. Two of them
 * gate sending a live sponsor invitation: the designated gun custodian (§5-06,
 * gates the whole case) and the applicant's exact legal first name (a wrong name
 * is a rejection). The rest are tracked so nothing quietly sits unresolved.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface OperatorBlocker {
  title: string
  description: string
}

/** The standing operator-blocker set for a sponsored case. */
export const OPERATOR_BLOCKERS: OperatorBlocker[] = [
  { title: "Confirm the sponsoring agency's WGP licence", description: "The company's current NYS Watch, Guard or Patrol Agency licence number and expiry, from an authorised representative — not a directory." },
  { title: "Confirm the designated NYPD gun custodian", description: "The company's designated NYPD-licensed gun custodian and licence number. Per 38 RCNY §5-06 this gates the entire case." },
  { title: "Obtain the current 20-hour worksheet", description: "The current official 20-hour worksheet form — confirm we are using the live version." },
  { title: "Confirm the letter-of-necessity format", description: "The current NYPD letter-of-necessity format — page 3 of the application, or company letterhead." },
  { title: "Confirm authorised company signatories", description: "Who signs the company form — the rep or the custodian personally." },
  { title: "Confirm the §5-09 submission process", description: "The pre-licence exemption submission + approval process in practice, and the firearms school's policy on a pending exemption." },
  { title: "Confirm the applicant's residence / track", description: "Carry Guard (NYC) vs Special Carry Guard (NY State outside NYC) — resolve the category." },
  { title: "Confirm the applicant's exact legal first name", description: "Resolve from the applicant's identity document (IDN-01) or directly from them. Do not guess or normalise." },
]

/** Seed the operator-blocker tasks for a case (idempotent — skips ones already present). */
export async function seedOperatorBlockers(admin: DB, caseId: string, assignee: string | null): Promise<number> {
  const { data: existing } = await admin.from("tasks").select("title").eq("case_id", caseId)
  const have = new Set((existing ?? []).map((t) => t.title))
  const rows = OPERATOR_BLOCKERS.filter((b) => !have.has(b.title)).map((b) => ({
    case_id: caseId,
    title: b.title,
    description: b.description,
    assignee,
    priority: 1,
  }))
  if (rows.length) await admin.from("tasks").insert(rows)
  return rows.length
}
