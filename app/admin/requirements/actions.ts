"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff, requireAdmin } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { materializeCaseRequirements, type IntakeAnswers } from "@/lib/requirements"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

/**
 * Close a registry version: set its `effective_to`. Future cases stop generating
 * this row; existing case_requirements that already reference it are untouched.
 */
export async function retireRequirement(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  // V3-P0.3 — the registry is legal-compliance-bearing; admin only.
  await requireAdmin()
  const parsed = z
    .object({ id: z.string().uuid(), effectiveTo: isoDate })
    .safeParse({
      id: formData.get("id"),
      effectiveTo: formData.get("effectiveTo"),
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("requirements")
    .update({ effective_to: parsed.data.effectiveTo })
    .eq("id", parsed.data.id)
    .select("req_code")
    .single()
  if (error) return { error: error.message }

  await logActivity({
    action: "requirement.retired",
    entity: "requirement",
    entityId: parsed.data.id,
    detail: { req_code: data.req_code, effective_to: parsed.data.effectiveTo },
  })
  revalidatePath("/admin/requirements")
  return { ok: true }
}

/**
 * Add a new dated version of a requirement (same req_code, new effective_from,
 * open effective_to). Copies the source row's machine fields and lets the editor
 * adjust the human/severity/date fields. New cases generate against this; old
 * ones keep their prior version.
 */
export async function addRequirementVersion(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  // V3-P0.3 — the registry is legal-compliance-bearing; admin only.
  await requireAdmin()
  const parsed = z
    .object({
      sourceId: z.string().uuid(),
      title: z.string().min(2),
      authority: z.string().optional().or(z.literal("")),
      description: z.string().optional().or(z.literal("")),
      severity: z.enum(["critical", "high", "watch", "long_lead"]),
      effectiveFrom: isoDate,
    })
    .safeParse({
      sourceId: formData.get("sourceId"),
      title: formData.get("title"),
      authority: formData.get("authority") ?? "",
      description: formData.get("description") ?? "",
      severity: formData.get("severity"),
      effectiveFrom: formData.get("effectiveFrom"),
    })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const input = parsed.data

  const supabase = await createClient()
  // Pull the source row's machine fields (validation_rule, trigger_cond, etc.).
  const { data: src, error: srcErr } = await supabase
    .from("requirements")
    .select("jurisdiction_id, req_code, validation_rule, trigger_cond, document_type")
    .eq("id", input.sourceId)
    .single()
  if (srcErr) return { error: srcErr.message }

  const { data: created, error } = await supabase
    .from("requirements")
    .insert({
      jurisdiction_id: src.jurisdiction_id,
      req_code: src.req_code,
      title: input.title,
      description: input.description || null,
      authority: input.authority || null,
      validation_rule: src.validation_rule,
      trigger_cond: src.trigger_cond,
      document_type: src.document_type,
      severity: input.severity,
      effective_from: input.effectiveFrom,
    })
    .select("id")
    .single()
  if (error) return { error: error.message }

  await logActivity({
    action: "requirement.versioned",
    entity: "requirement",
    entityId: created.id,
    detail: { req_code: src.req_code, effective_from: input.effectiveFrom },
  })
  revalidatePath("/admin/requirements")
  return { ok: true }
}

/**
 * (Re)generate a case's requirement instances from the current active registry.
 * Phase 1 uses default answers (carry, no disclosures); Phase 2 will pass the
 * intake_sessions answers. Runs via the service-role client (trusted system op).
 */
export async function generateCaseRequirementsAction(
  caseId: string,
  jurisdictionKey: string = "nyc",
  answers: IntakeAnswers = { isCarry: true }
) {
  await requireStaff()
  const admin = createAdminClient()
  const result = await materializeCaseRequirements(admin, caseId, jurisdictionKey, answers)

  await logActivity({
    action: "case.requirements_generated",
    caseId,
    entity: "case",
    entityId: caseId,
    detail: { ...result, jurisdiction: jurisdictionKey },
  })
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/portal/checklist")
  return result
}
