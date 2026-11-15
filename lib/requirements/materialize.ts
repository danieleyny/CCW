// DB-touching requirements helpers. NOT marked `server-only` so plain Node
// scripts (seed, verify-pN) can import it with a service-role client; app code
// imports the `server-only` barrel at ./index instead.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  generateCaseRequirements,
  requirementApplies,
  type ActiveRequirementRow,
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
    // Sponsor-owned rows are the company packet — seeded by materializeSponsorPacket(),
    // never by the generic applicant generator. Keep the two paths disjoint.
    .neq("party", "sponsor")
    .lte("effective_from", t)
    .or(`effective_to.is.null,effective_to.gte.${t}`)
    .order("req_code", { ascending: true })

  return data ?? []
}

/**
 * Seed the SPONSOR company packet (SPN-*) for a case that has a sponsorship,
 * independent of the applicant's resolved jurisdiction/track — so the packet can
 * proceed even while the applicant's category is 'sponsored_unresolved'. The rows
 * live under the `nyc` jurisdiction as the canonical carrier (party='sponsor').
 * Idempotent; never disturbs a satisfied/rejected packet row or its evidence.
 */
export async function materializeSponsorPacket(admin: DB, caseId: string): Promise<MaterializeResult> {
  const t = today()
  const { data: jur } = await admin
    .from("jurisdiction_profiles")
    .select("id")
    .eq("key", "nyc")
    .maybeSingle()
  if (!jur) return { inserted: 0, updated: 0, applicable: 0, total: 0 }

  const { data: spn } = await admin
    .from("requirements")
    .select("id, req_code")
    .eq("jurisdiction_id", jur.id)
    .eq("party", "sponsor")
    .lte("effective_from", t)
    .or(`effective_to.is.null,effective_to.gte.${t}`)
  const rows = spn ?? []

  const { data: existing } = await admin
    .from("case_requirements")
    .select("id, requirement_id, req_code, status")
    .eq("case_id", caseId)
  const byCode = new Map((existing ?? []).map((r) => [r.req_code, r]))

  const inserts: Database["public"]["Tables"]["case_requirements"]["Insert"][] = []
  for (const r of rows) {
    // req_code is the stable identity across dated registry versions. An older
    // case keeps its historical requirement_id, but must never get a second
    // SPN card when the registry publishes a new version of the same rule.
    if (byCode.has(r.req_code)) continue
    inserts.push({ case_id: caseId, requirement_id: r.id, req_code: r.req_code, status: "pending" })
  }
  if (inserts.length) {
    const { error } = await admin.from("case_requirements").insert(inserts)
    if (error) throw error
  }
  return { inserted: inserts.length, updated: 0, applicable: rows.length, total: rows.length }
}

export interface MaterializeResult {
  inserted: number
  updated: number
  applicable: number
  total: number
}

export interface ExistingMaterializedRequirement {
  id: string
  requirementId: string
  reqCode: string
  status: Database["public"]["Enums"]["case_req_status"]
  /** The trigger from the exact historical registry row this case points at. */
  triggerCond?: string | null
}

/** Pure materialization planner. `reqCode`—not a versioned requirement UUID—is
 * the per-case identity. Existing rows continue to use their historical rule's
 * trigger; only genuinely new codes use the active registry version. */
export function planCaseRequirementMaterialization(
  active: ActiveRequirementRow[],
  existing: ExistingMaterializedRequirement[],
  answers: IntakeAnswers
) {
  const generated = generateCaseRequirements(active, answers)
  const byCode = new Map<string, ExistingMaterializedRequirement[]>()
  for (const row of existing) {
    const rows = byCode.get(row.reqCode) ?? []
    rows.push(row)
    byCode.set(row.reqCode, rows)
  }

  const inserts: typeof generated = []
  const updates: Array<{ id: string; status: Database["public"]["Enums"]["case_req_status"] }> = []
  for (const g of generated) {
    const matches = byCode.get(g.reqCode) ?? []
    if (!matches.length) {
      inserts.push(g)
      continue
    }
    for (const row of matches) {
      if (row.status !== "pending" && row.status !== "na") continue
      const applies = row.triggerCond ? requirementApplies(row.triggerCond, answers) : g.applies
      const target: Database["public"]["Enums"]["case_req_status"] = applies ? "pending" : "na"
      if (row.status !== target) updates.push({ id: row.id, status: target })
    }
  }
  return { generated, inserts, updates }
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
  const { data: existing } = await admin
    .from("case_requirements")
    .select("id, requirement_id, req_code, status, requirement:requirements(trigger_cond)")
    .eq("case_id", caseId)
  const historical = (existing ?? []).map((row) => {
    const requirement = row.requirement as unknown as { trigger_cond?: string } | null
    return {
      id: row.id,
      requirementId: row.requirement_id,
      reqCode: row.req_code,
      status: row.status,
      triggerCond: requirement?.trigger_cond,
    }
  })
  const plan = planCaseRequirementMaterialization(active, historical, answers)
  const inserts: Database["public"]["Tables"]["case_requirements"]["Insert"][] = plan.inserts.map((g) => ({
    case_id: caseId,
    requirement_id: g.requirementId,
    req_code: g.reqCode,
    status: g.applies ? "pending" : "na",
  }))

  if (inserts.length) {
    const { error } = await admin.from("case_requirements").insert(inserts)
    if (error) throw error
  }
  for (const u of plan.updates) {
    const { error } = await admin
      .from("case_requirements")
      .update({ status: u.status })
      .eq("id", u.id)
    if (error) throw error
  }

  return {
    inserted: inserts.length,
    updated: plan.updates.length,
    applicable: plan.generated.filter((g) => g.applies).length,
    total: plan.generated.length,
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
    /** 'applicant' (default) | 'sponsor' — sponsor rows are the company packet. */
    party: string
    /** Where the document goes: portal_upload | interview | internal. */
    destination: string
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
        "requirement:requirements(id, title, description, authority, severity, trigger_cond, document_type, effective_from, legal_status, legal_citation, party, destination)"
    )
    .eq("case_id", caseId)
    .order("req_code", { ascending: true })

  return (data ?? []) as unknown as CaseRequirementRow[]
}
