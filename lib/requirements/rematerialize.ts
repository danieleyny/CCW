import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { materializeCaseRequirements, materializeSponsorPacket, type MaterializeResult } from "@/lib/requirements/materialize"
import { toGeneratorAnswers, eligibilityGate, type WizardAnswers } from "@/lib/intake/answers"
import { resolveArmedTrack } from "@/lib/requirements/track"

type DB = SupabaseClient<Database>

/**
 * Re-run the requirement generator for an EXISTING case, exactly as intake did the
 * first time — so a case that predates newly-added registry rows picks them up.
 * ADDITIVE and idempotent: materializeCaseRequirements inserts missing rows and
 * flips pending/na to match applicability, but leaves satisfied/rejected rows
 * (evidence already bound) untouched. Use it after any requirements migration.
 *
 * Returns null when the case has no usable intake yet (nothing to generate from).
 */
export async function rematerializeCase(admin: DB, caseId: string): Promise<MaterializeResult | null> {
  const [{ data: kase }, { data: intakeRow }, { data: sp }] = await Promise.all([
    admin.from("cases").select("is_renewal").eq("id", caseId).maybeSingle(),
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    admin.from("case_sponsorships").select("id").eq("case_id", caseId).limit(1).maybeSingle(),
  ])
  if (!kase) return null
  const answers = (intakeRow?.answers ?? null) as WizardAnswers | null
  if (!answers || Object.keys(answers).length === 0) return null

  const jurisdictionKey = eligibilityGate(answers).jurisdiction
  const isSponsored = !!sp
  const armed = isSponsored ? resolveArmedTrack(answers) : null

  // A sponsored case whose armed category is unresolved seeds only the company
  // packet (mirrors lib/intake/process) — never the applicant's NYPD set.
  if (isSponsored && armed && !armed.isArmedGuard) {
    await materializeSponsorPacket(admin, caseId)
    return { inserted: 0, updated: 0, applicable: 0, total: 0 }
  }

  const result = await materializeCaseRequirements(
    admin,
    caseId,
    jurisdictionKey,
    toGeneratorAnswers(answers, { isRenewal: !!kase.is_renewal, armed: armed ?? undefined })
  )
  if (isSponsored) await materializeSponsorPacket(admin, caseId)
  return result
}
