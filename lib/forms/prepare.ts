import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { resolveFacts } from "@/lib/facts/resolve"
import { buildApplicationValues, type ApplicationValues } from "@/lib/forms/application"
import type { WizardAnswers } from "@/lib/intake/answers"

type DB = SupabaseClient<Database>

export interface AssembledApplication {
  values: ApplicationValues
  track: string | null
  clientId: string
}

/**
 * Assemble the PD 643-041 fill values for a case from the SAME three stores the
 * prepared PDF fills from — the fact layer, intake, and the canonical Section B
 * disclosure store (DSC-01/QUE-01). Shared by prepareApplication (to fill) and the
 * readiness gate (to report what's still empty) so the two never disagree about
 * what a draft will contain.
 */
export async function assembleApplicationValues(admin: DB, caseId: string): Promise<AssembledApplication | null> {
  const { data: kase } = await admin.from("cases").select("client_id, license_track").eq("id", caseId).maybeSingle()
  if (!kase?.client_id) return null

  const [facts, { data: intakeRow }, { data: disclosureRows }] = await Promise.all([
    resolveFacts(admin, caseId),
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["DSC-01", "QUE-01"]),
  ])
  const intake = (intakeRow?.answers ?? {}) as WizardAnswers
  const byCode = new Map((disclosureRows ?? []).map((r) => [r.req_code, (r.answers ?? {}) as Record<string, unknown>]))
  const disclosures = byCode.get("DSC-01") ?? byCode.get("QUE-01") ?? {}
  const values = buildApplicationValues(facts, intake, { licenseTrack: kase.license_track, disclosures })
  return { values, track: kase.license_track, clientId: kase.client_id }
}
