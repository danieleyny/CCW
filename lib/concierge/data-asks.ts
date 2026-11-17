import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { resolveFacts } from "@/lib/facts/resolve"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { buildFactGroups, type FactGroupData } from "@/lib/facts/details-view"
import type { FactGroup } from "@/lib/facts/registry"
import type { WizardAnswers } from "@/lib/intake/answers"
import {
  applicationTypeNeedsCarryTraining,
  type ApplicationType,
} from "@/lib/application-types"

type DB = SupabaseClient<Database>

/**
 * The DATA the portal needs — first-class asks for the concierge checklist. The
 * collection already exists (/portal/details, ApplicationHistory, LON-01, CON-01) but
 * the concierge page never linked to it, so a concierge applicant finished the flow
 * without ever being asked for their employer or histories. Each ask is a card with
 * "N of M captured" and a deep-link to the exact section.
 */
export interface DataAsk {
  key: string
  label: string
  captured: number
  total: number
  href: string
}

function countGroups(groups: FactGroupData[], keys: FactGroup[]): { captured: number; total: number } {
  let captured = 0
  let total = 0
  for (const g of groups) {
    if (!keys.includes(g.key)) continue
    for (const r of g.rows) {
      if (r.kind !== "editable" || r.optional) continue
      total++
      if (r.value.trim()) captured++
    }
  }
  return { captured, total }
}

export async function buildDataAsks(admin: DB, caseId: string): Promise<DataAsk[]> {
  const facts = await resolveFacts(admin, caseId)
  const hasSsn = await hasCaseSsn(admin, caseId)
  const { groups } = buildFactGroups(facts, hasSsn, ["you", "address", "contact", "physical", "employer", "safeguard"], false)

  const [
    { data: intakeRow },
    { data: answerRows },
    { data: requirementRows },
    { data: caseRow },
  ] = await Promise.all([
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["LON-01", "CON-01"]),
    admin.from("case_requirements").select("req_code, status").eq("case_id", caseId).in("req_code", ["LON-01", "CON-01"]),
    admin.from("cases").select("application_type, is_renewal").eq("id", caseId).maybeSingle(),
  ])
  const intake = (intakeRow?.answers ?? {}) as WizardAnswers
  const byCode = new Map((answerRows ?? []).map((r) => [r.req_code, (r.answers ?? {}) as Record<string, unknown>]))
  const lon = byCode.get("LON-01") ?? {}
  const con = byCode.get("CON-01") ?? {}
  const materializedCodes = new Set((requirementRows ?? []).map((r) => r.req_code))
  const applicableCodes = new Set(
    (requirementRows ?? []).filter((r) => r.status !== "na").map((r) => r.req_code)
  )
  const applicationType = caseRow?.application_type as ApplicationType | null | undefined
  const includeLon = materializedCodes.has("LON-01")
    ? applicableCodes.has("LON-01")
    : applicationTypeNeedsCarryTraining(applicationType) && !caseRow?.is_renewal
  const includeConfidentiality = materializedCodes.has("CON-01")
    ? applicableCodes.has("CON-01")
    : true

  const details = countGroups(groups, ["you", "address", "contact", "physical"])
  const employer = countGroups(groups, ["employer"])
  const safeguard = countGroups(groups, ["safeguard"])

  const resCount = (intake.residenceHistory ?? []).length
  const empCount = (intake.employmentHistory ?? []).length

  // Letter of Necessity is carry-only. Premise Residence must never see this
  // ask; the materialized requirement is authoritative, with the explicit case
  // category as the compatibility fallback for older unmaterialized cases.
  const lonHave = ["lop3", "lop6"].filter((k) => typeof lon[k] === "string" && (lon[k] as string).trim()).length

  const asks: DataAsk[] = [
    { key: "details", label: "Your details", captured: details.captured, total: details.total, href: "/portal/details#you" },
    { key: "residence", label: "Where you've lived (5 years)", captured: Math.min(resCount, 1), total: 1, href: "/portal/details#history" },
    { key: "employment", label: "Where you've worked (5 years)", captured: (employer.captured > 0 ? 1 : 0) + (empCount > 0 ? 1 : 0), total: 2, href: "/portal/details#history" },
    { key: "safeguard", label: "Keeping your firearm safe", captured: safeguard.captured, total: safeguard.total, href: "/portal/details#safeguard" },
  ]
  // Concierge home is /portal/concierge — the LON/CON cards live in its vault, each
  // RequirementCard carrying id=reqCode (and opening its questionnaire on the hash).
  if (includeLon) {
    asks.push({ key: "lon", label: "Your written statements", captured: lonHave, total: 2, href: "/portal/concierge#LON-01" })
  }
  if (includeConfidentiality) {
    asks.push({
      key: "confidentiality",
      label: "Confidentiality (optional)",
      captured: con.requesting === "yes" || con.requesting === "no" ? 1 : 0,
      total: 1,
      href: "/portal/concierge#CON-01",
    })
  }
  return asks
}
