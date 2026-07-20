"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { requireRole } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { eligibilityGate, type WizardAnswers } from "@/lib/intake/answers"
import { wizardAnswersSchema, completionIssues } from "@/lib/intake/schema"
import { processIntake, evaluateSubmissionGuard, type SubmissionGuard } from "@/lib/intake/process"
import type { Json } from "@/lib/supabase/types"

/** V3-P0.6 — shape-validate at the boundary; nothing unparsed reaches jsonb. */
function parseAnswers(raw: unknown): { answers?: WizardAnswers; error?: string } {
  const parsed = wizardAnswersSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: `Invalid intake data${issue ? ` (${issue.path.join(".")}: ${issue.message})` : ""}` }
  }
  return { answers: parsed.data as WizardAnswers }
}

/** Guard shape returned on any early-out so the UI always has one to read. */
const EMPTY_GUARD: SubmissionGuard = { ok: false, blockers: [], emptyNarrativeCount: 0, pendingCount: 0 }

/** Confirm the signed-in client owns this case; returns it or null (RLS-scoped). */
async function ownedCase(caseId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, client_id, is_renewal")
    .eq("id", caseId)
    .maybeSingle()
  return data
}

/** Get-or-create the resumable intake session for a case. */
export async function ensureIntakeSession(caseId: string) {
  await requireRole(["client"])
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("intake_sessions")
    .select("id, current_step, answers, completed_at")
    .eq("case_id", caseId)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from("intake_sessions")
    .insert({ case_id: caseId })
    .select("id, current_step, answers, completed_at")
    .single()
  if (error) throw error
  return data
}

/** Persist wizard progress (resumable). Client writes their own via RLS. */
export async function saveIntakeStep(
  caseId: string,
  step: number,
  answers: WizardAnswers
): Promise<{ ok: true } | { error: string }> {
  await requireRole(["client"])
  const parsed = parseAnswers(answers)
  if (parsed.error || !parsed.answers) {
    // Surface the specific field/row that failed instead of a generic toast.
    console.error("[intake] saveIntakeStep validation failed:", parsed.error)
    return { error: parsed.error ?? "Invalid intake data" }
  }
  if (!Number.isInteger(step) || step < 1 || step > 6) return { error: "Invalid step" }

  const supabase = await createClient()
  // Upsert (not update): case_id is UNIQUE, so this self-heals if the session
  // row is somehow missing instead of silently no-opping against zero rows.
  const { error } = await supabase
    .from("intake_sessions")
    .upsert(
      { case_id: caseId, current_step: step, answers: parsed.answers as unknown as Json },
      { onConflict: "case_id" }
    )
  if (error) {
    console.error("[intake] saveIntakeStep db error:", error)
    return { error: `Couldn't save progress: ${error.message}` }
  }
  revalidatePath("/portal/intake")
  return { ok: true }
}

/**
 * Complete intake: persist answers, run deterministic generation (disclosures,
 * cohabitants, case_requirements) via the service-role client, and return the
 * submission guard so the UI can show what still blocks filing.
 */
export async function completeIntake(
  caseId: string,
  rawAnswers: WizardAnswers
): Promise<{ guard: SubmissionGuard; blockedEligibility: boolean; validationErrors?: string[]; error?: string }> {
  await requireRole(["client"])
  const kase = await ownedCase(caseId)
  if (!kase) return { error: "Case not found", blockedEligibility: false, guard: EMPTY_GUARD }

  const parsed = parseAnswers(rawAnswers)
  if (parsed.error || !parsed.answers) {
    console.error("[intake] completeIntake validation failed:", parsed.error)
    return { error: parsed.error ?? "Invalid intake data", blockedEligibility: false, guard: EMPTY_GUARD }
  }
  const answers = parsed.answers

  const gate = eligibilityGate(answers)
  if (gate.blocked) {
    // Hard gate: route to attorney-review track, do not generate a normal packet.
    const supabase = await createClient()
    await supabase
      .from("intake_sessions")
      .upsert(
        { case_id: caseId, current_step: 6, answers: answers as unknown as Json },
        { onConflict: "case_id" }
      )
    await logActivity({
      action: "intake.attorney_review_required",
      caseId,
      entity: "case",
      entityId: caseId,
      detail: { reasons: gate.reasons },
    })
    return {
      blockedEligibility: true,
      guard: { ok: false, blockers: [], emptyNarrativeCount: 0, pendingCount: 0 },
    }
  }

  // V3-P0.6 — business rules (track-aware reference count, complete arrest
  // rows, DOB). Save progress so nothing is lost; do NOT generate until they pass.
  const issues = completionIssues(answers, { isRenewal: !!kase.is_renewal })
  if (issues.length > 0) {
    const supabase = await createClient()
    await supabase
      .from("intake_sessions")
      .upsert(
        { case_id: caseId, current_step: 6, answers: answers as unknown as Json },
        { onConflict: "case_id" }
      )
    return {
      blockedEligibility: false,
      validationErrors: issues,
      guard: { ok: false, blockers: [], emptyNarrativeCount: 0, pendingCount: 0 },
    }
  }

  const supabase = await createClient()
  await supabase
    .from("intake_sessions")
    .upsert(
      {
        case_id: caseId,
        current_step: 6,
        answers: answers as unknown as Json,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "case_id" }
    )

  // Deterministic generation runs under the service-role client. Wrap it so a
  // genuine failure (a schema drift, a bad row) surfaces the real reason instead
  // of the generic "Generation failed" toast.
  try {
    const admin = createAdminClient()
    const result = await processIntake(admin, caseId, gate.jurisdiction, answers)
    const guard = await evaluateSubmissionGuard(admin, caseId)

    // Intake cleared the eligibility gate — that IS the screening. Stay here and
    // let the later milestones (payment, booking, training, documents) each move
    // the case one step, so the pipeline reflects what actually happened rather
    // than jumping to the end of it.
    await maybeAdvanceStage(admin, caseId, "eligibility_screened", "intake.completed")

    await logActivity({
      action: "intake.completed",
      caseId,
      entity: "case",
      entityId: caseId,
      detail: { ...result, jurisdiction: gate.jurisdiction, guardOk: guard.ok },
    })

    revalidatePath("/portal/intake")
    revalidatePath("/portal/checklist")
    revalidatePath("/portal")
    return { guard, blockedEligibility: false }
  } catch (e) {
    console.error("[intake] completeIntake generation failed:", e)
    const detail = e instanceof Error ? e.message : "unknown error"
    return { error: `Generation failed: ${detail}`, blockedEligibility: false, guard: EMPTY_GUARD }
  }
}

/** Fill/edit a disclosure's required narrative; re-evaluate the guard. */
export async function updateDisclosureNarrative(
  caseId: string,
  disclosureId: string,
  narrative: string
): Promise<SubmissionGuard> {
  await requireRole(["client"])
  if (typeof narrative !== "string" || narrative.length > 8000) throw new Error("Invalid narrative")
  const supabase = await createClient()
  const { error } = await supabase
    .from("disclosures")
    .update({ narrative })
    .eq("id", disclosureId)
    .eq("case_id", caseId)
  if (error) throw error
  revalidatePath("/portal/intake")
  return evaluateSubmissionGuard(supabase, caseId)
}
