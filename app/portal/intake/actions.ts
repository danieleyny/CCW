"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

/** Confirm the signed-in client owns this case; returns it or null (RLS-scoped). */
async function ownedCase(caseId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, client_id")
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
export async function saveIntakeStep(caseId: string, step: number, answers: WizardAnswers) {
  await requireRole(["client"])
  const parsed = parseAnswers(answers)
  if (parsed.error || !parsed.answers) throw new Error(parsed.error ?? "Invalid intake data")
  if (!Number.isInteger(step) || step < 1 || step > 6) throw new Error("Invalid step")

  const supabase = await createClient()
  const { error } = await supabase
    .from("intake_sessions")
    .update({ current_step: step, answers: parsed.answers as unknown as Json })
    .eq("case_id", caseId)
  if (error) throw error
  revalidatePath("/portal/intake")
}

/**
 * Complete intake: persist answers, run deterministic generation (disclosures,
 * cohabitants, case_requirements) via the service-role client, and return the
 * submission guard so the UI can show what still blocks filing.
 */
export async function completeIntake(
  caseId: string,
  rawAnswers: WizardAnswers
): Promise<{ guard: SubmissionGuard; blockedEligibility: boolean; validationErrors?: string[] }> {
  await requireRole(["client"])
  const kase = await ownedCase(caseId)
  if (!kase) throw new Error("Case not found")

  const parsed = parseAnswers(rawAnswers)
  if (parsed.error || !parsed.answers) throw new Error(parsed.error ?? "Invalid intake data")
  const answers = parsed.answers

  const gate = eligibilityGate(answers)
  if (gate.blocked) {
    // Hard gate: route to attorney-review track, do not generate a normal packet.
    const supabase = await createClient()
    await supabase
      .from("intake_sessions")
      .update({ current_step: 6, answers: answers as unknown as Json })
      .eq("case_id", caseId)
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

  // V3-P0.6 — business rules (4 valid references, complete arrest rows, DOB).
  // Save progress so nothing is lost, but do NOT generate until they pass.
  const issues = completionIssues(answers)
  if (issues.length > 0) {
    const supabase = await createClient()
    await supabase
      .from("intake_sessions")
      .update({ current_step: 6, answers: answers as unknown as Json })
      .eq("case_id", caseId)
    return {
      blockedEligibility: false,
      validationErrors: issues,
      guard: { ok: false, blockers: [], emptyNarrativeCount: 0, pendingCount: 0 },
    }
  }

  const supabase = await createClient()
  await supabase
    .from("intake_sessions")
    .update({ current_step: 6, answers: answers as unknown as Json, completed_at: new Date().toISOString() })
    .eq("case_id", caseId)

  const admin = createAdminClient()
  const result = await processIntake(admin, caseId, gate.jurisdiction, answers)
  const guard = await evaluateSubmissionGuard(admin, caseId)

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
