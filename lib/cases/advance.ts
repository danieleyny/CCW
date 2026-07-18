/**
 * AUTOMATIC STAGE ADVANCEMENT.
 *
 * Nothing moved a case forward on its own: `setCaseStage` lives in the admin
 * actions and is driven by a staffer clicking. So an applicant could finish
 * intake, pay, complete training and upload half their documents while their
 * portal still said "Lead / Inquiry" — technically true of what staff had
 * recorded, and meaningless to the person who'd done the work.
 *
 * This advances the EARLY stages off real milestones. Three rules make it safe:
 *
 *  1. FORWARD ONLY. A milestone that fires late (a webhook retry, a re-upload)
 *     can never drag a case backwards.
 *  2. NEVER past `notarization`. `application_assembled` and `filed` stay behind
 *     the CP-5 gate and a named staff sign-off in setCaseStage — automation must
 *     not become a back door around pre-filing QA. Asking for one is a bug.
 *  3. Idempotent. Same milestone twice = one advance, one activity row.
 *
 * A staffer can still set any stage by hand; a manual stage at or past
 * application_assembled outranks anything here, because rule 2 means we never
 * touch a case that far along.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { stageIndex, type CaseStageKey } from "@/config/stages"


type DB = SupabaseClient<Database>

/** The furthest stage automation may ever reach. */
export const AUTO_STAGE_CEILING: CaseStageKey = "notarization"

/** Stages automation is allowed to set, in order. */
export const AUTO_STAGES: CaseStageKey[] = [
  "eligibility_screened",
  "signed_up_paid",
  "training_scheduled",
  "training_complete",
  "document_collection",
  "notarization",
]

export interface AdvanceResult {
  moved: boolean
  from?: CaseStageKey
  to?: CaseStageKey
  reason?: string
}

/**
 * Move a case to `to` if — and only if — that's forward, allowed, and the case
 * isn't already past the automation ceiling.
 *
 * Service-role client: the milestones fire from webhooks and from client-side
 * actions where the actor isn't staff, and stage is a staff-owned column.
 */
export async function maybeAdvanceStage(
  admin: DB,
  caseId: string,
  to: CaseStageKey,
  milestone: string
): Promise<AdvanceResult> {
  if (!AUTO_STAGES.includes(to)) {
    // A caller asking automation to reach application_assembled/filed is a bug,
    // not a configuration choice — fail loudly rather than quietly gate it.
    throw new Error(
      `maybeAdvanceStage refuses ${to}: automation stops at ${AUTO_STAGE_CEILING} (CP-5 gate + staff sign-off own the rest)`
    )
  }

  const { data: kase } = await admin.from("cases").select("stage").eq("id", caseId).maybeSingle()
  if (!kase) return { moved: false }

  const from = kase.stage as CaseStageKey
  // Already here, further along, or past the ceiling → leave it alone.
  if (stageIndex(from) >= stageIndex(to)) return { moved: false, from }
  if (stageIndex(from) > stageIndex(AUTO_STAGE_CEILING)) return { moved: false, from }

  const { error } = await admin
    .from("cases")
    .update({ stage: to, stage_entered_at: new Date().toISOString() })
    .eq("id", caseId)
    // Belt and braces against a concurrent update racing us backwards.
    .eq("stage", from)
  if (error) throw error

  // Logged with the same service-role client rather than logActivity(): these
  // milestones fire from Stripe webhooks and instructor actions where there is
  // no applicable session, and the honest actor here is the system (null), not
  // whoever happened to trigger the request.
  await admin.from("activity_log").insert({
    actor: null,
    action: "case.stage_auto_advanced",
    case_id: caseId,
    entity: "case",
    entity_id: caseId,
    detail: { from, to, milestone } as never,
  })

  return { moved: true, from, to, reason: milestone }
}
