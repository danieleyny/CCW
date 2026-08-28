import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { materializeCaseRequirements, materializeSponsorPacket, type MaterializeResult } from "@/lib/requirements/materialize"
import { toGeneratorAnswers, eligibilityGate, type WizardAnswers } from "@/lib/intake/answers"
import { loadConditionSources, deriveConditionFlags } from "@/lib/requirements/conditions"
import { resolveArmedTrack } from "@/lib/requirements/track"

type DB = SupabaseClient<Database>

/**
 * Re-run the requirement generator for an EXISTING case, exactly as intake did the
 * first time — so a case that predates newly-added registry rows, OR a concierge
 * case that never filled the wizard, picks up every rule it should. ADDITIVE and
 * idempotent: materializeCaseRequirements inserts missing rows and flips pending/na
 * to match applicability, but leaves satisfied/rejected rows (evidence already
 * bound) untouched. Use it after any requirements migration AND on every disclosure
 * save (a "yes" must spawn the addendum/arrest requirements in the same request).
 *
 * Returns null only when the case itself is missing.
 */
export async function rematerializeCase(admin: DB, caseId: string): Promise<MaterializeResult | null> {
  const [{ data: kase }, { data: intakeRow }, { data: sp }, sources] = await Promise.all([
    admin.from("cases").select("is_renewal, license_track, service_mode").eq("id", caseId).maybeSingle(),
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    admin.from("case_sponsorships").select("id").eq("case_id", caseId).limit(1).maybeSingle(),
    loadConditionSources(admin, caseId),
  ])
  if (!kase) return null

  const rawAnswers = (intakeRow?.answers ?? null) as WizardAnswers | null
  // A concierge case has no wizard, so synthesize the minimum the generator needs —
  // the track is carry unless the case is explicitly premises. Conditional rules no
  // longer depend on the wizard; they come from the canonical stores below.
  const hasIntake = !!rawAnswers && Object.keys(rawAnswers).length > 0
  const answers: WizardAnswers = hasIntake ? rawAnswers! : ({ licenseType: "carry" } as WizardAnswers)

  const { flags, source } = deriveConditionFlags(rawAnswers, sources)
  // eslint-disable-next-line no-console
  console.log(`[rematerialize] case ${caseId} conditions:`, { ...flags, _sources: source, hasIntake })

  const jurisdictionKey = eligibilityGate(answers).jurisdiction
  const isSponsored = !!sp
  const armed = isSponsored && hasIntake ? resolveArmedTrack(answers) : null

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
    toGeneratorAnswers(answers, { isRenewal: !!kase.is_renewal, armed: armed ?? undefined, conditions: flags })
  )
  if (isSponsored) await materializeSponsorPacket(admin, caseId)
  return result
}
