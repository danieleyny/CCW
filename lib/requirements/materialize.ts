// DB-touching requirements helpers. NOT marked `server-only` so plain Node
// scripts (seed, verify-pN) can import it with a service-role client; app code
// imports the `server-only` barrel at ./index instead.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  generateCaseRequirements,
  type IntakeAnswers,
} from "./generate"

export type { IntakeAnswers } from "./generate"

type DB = SupabaseClient<Database>

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Active (currently-in-force) registry rows for a jurisdiction: effective window
 * contains today. New cases generate against these; old `case_requirements`
 * keep pointing at the specific (possibly retired) version they were made from.
 */
export async function getActiveRequirements(db: DB, jurisdictionKey: string) {
  const t = today()
  const { data: jur } = await db
    .from("jurisdiction_profiles")
    .select("id")
    .eq("key", jurisdictionKey as Database["public"]["Enums"]["jurisdiction_key"])
    .maybeSingle()
  if (!jur) return []

  const { data } = await db
    .from("requirements")
    .select("id, req_code, title, authority, severity, trigger_cond, document_type, effective_from")
    .eq("jurisdiction_id", jur.id)
    .lte("effective_from", t)
    .or(`effective_to.is.null,effective_to.gte.${t}`)
    .order("req_code", { ascending: true })

  return data ?? []
}

export interface MaterializeResult {
  inserted: number
  updated: number
  applicable: number
  total: number
}

/**
 * Upsert the per-case requirement instances from the active registry + answers.
 * Trusted system operation — pass a service-role (admin) client; never clobbers
 * an already `satisfied`/`rejected` row or its evidence binding (only moves
 * pending<->na as the answers/registry change). Idempotent.
 */
export async function materializeCaseRequirements(
  admin: DB,
  caseId: string,
  jurisdictionKey: string,
  answers: IntakeAnswers
): Promise<MaterializeResult> {
  const active = await getActiveRequirements(admin, jurisdictionKey)
  const generated = generateCaseRequirements(active, answers)

  const { data: existing } = await admin
    .from("case_requirements")
    .select("id, requirement_id, status")
    .eq("case_id", caseId)
  const byReq = new Map((existing ?? []).map((r) => [r.requirement_id, r]))

  const inserts: Database["public"]["Tables"]["case_requirements"]["Insert"][] = []
  const updates: Array<{ id: string; status: Database["public"]["Enums"]["case_req_status"] }> = []

  for (const g of generated) {
    const target: Database["public"]["Enums"]["case_req_status"] = g.applies ? "pending" : "na"
    const ex = byReq.get(g.requirementId)
    if (!ex) {
      inserts.push({
        case_id: caseId,
        requirement_id: g.requirementId,
        req_code: g.reqCode,
        status: target,
      })
    } else if (ex.status === "pending" || ex.status === "na") {
      if (ex.status !== target) updates.push({ id: ex.id, status: target })
    }
    // satisfied / rejected rows are left intact (evidence already bound)
  }

  if (inserts.length) {
    const { error } = await admin.from("case_requirements").insert(inserts)
    if (error) throw error
  }
  for (const u of updates) {
    const { error } = await admin
      .from("case_requirements")
      .update({ status: u.status })
      .eq("id", u.id)
    if (error) throw error
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    applicable: generated.filter((g) => g.applies).length,
    total: generated.length,
  }
}

export interface CaseRequirementRow {
  id: string
  req_code: string
  status: Database["public"]["Enums"]["case_req_status"]
  document_id: string | null
  reference_id: string | null
  cohabitant_id: string | null
  notes: string | null
  requirement: {
    id: string
    title: string
    description: string | null
    authority: string | null
    severity: string
    trigger_cond: string
    document_type: string | null
    effective_from: string
    /** Enforcement status — 'enjoined_not_enforced'/'repealed' can never block. */
    legal_status: string
    legal_citation: string | null
  } | null
}

/**
 * Per-case requirement instances joined to their registry row, for the portal
 * checklist and admin QA (one source of truth). RLS scopes by case visibility.
 * The embedded select is cast to an explicit shape — supabase-js's type parser
 * resolves the aliased embed to GenericStringError, so we own the row type here.
 */
export async function getCaseRequirements(db: DB, caseId: string): Promise<CaseRequirementRow[]> {
  const { data } = await db
    .from("case_requirements")
    .select(
      "id, req_code, status, document_id, reference_id, cohabitant_id, notes, " +
        "requirement:requirements(id, title, description, authority, severity, trigger_cond, document_type, effective_from, legal_status, legal_citation)"
    )
    .eq("case_id", caseId)
    .order("req_code", { ascending: true })

  return (data ?? []) as unknown as CaseRequirementRow[]
}
