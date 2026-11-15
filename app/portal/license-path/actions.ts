"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { materializeCaseRequirements } from "@/lib/requirements/materialize"
import {
  APPLICANT_SELECTABLE_APPLICATION_TYPES,
  applicationTypeToGeneratorAnswers,
  applicationTypeToLegacyLicenseType,
  type ApplicantSelectableApplicationType,
} from "@/lib/application-types"
import type { Json } from "@/lib/supabase/types"

const schema = z.object({
  applicationType: z.enum(APPLICANT_SELECTABLE_APPLICATION_TYPES),
})

export type SelectApplicationTypeResult = { error?: string }

/**
 * Record the applicant's legal category before any service package or checklist
 * is generated. The choice is editable only while the case is genuinely early;
 * once intake or case work exists, staff must review a category change so no
 * evidence is silently relabelled.
 */
export async function selectApplicationType(
  _prev: SelectApplicationTypeResult,
  formData: FormData
): Promise<SelectApplicationTypeResult> {
  const auth = await requireRole(["client"])
  const parsed = schema.safeParse({ applicationType: formData.get("applicationType") })
  if (!parsed.success) return { error: "Choose the option that matches what you want to apply for." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  const admin = createAdminClient()
  const [{ data: intake }, { count: evidenceCount }] = await Promise.all([
    admin
      .from("intake_sessions")
      .select("answers, completed_at")
      .eq("case_id", myCase.id)
      .maybeSingle(),
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id),
  ])

  const categoryChanged = myCase.application_type !== parsed.data.applicationType
  const earlyStage = myCase.stage === "lead" || myCase.stage === "eligibility_screened"
  if (categoryChanged && (!earlyStage || !!intake?.completed_at || (evidenceCount ?? 0) > 0)) {
    return {
      error:
        "Your case already has application work attached. Message your concierge before changing the licence type so nothing is lost or misclassified.",
    }
  }

  const applicationType = parsed.data.applicationType as ApplicantSelectableApplicationType
  const selectedAt = new Date().toISOString()

  // Service-role justified: cases is staff-write-only. This client-initiated
  // mutation is limited to the caller's own case (getMyCase) and to a validated,
  // server-enumerated category; the actor and timestamp are recorded.
  const { error } = await admin
    .from("cases")
    .update({
      application_type: applicationType,
      application_type_selected_at: selectedAt,
      application_type_selected_by: auth.userId,
    })
    .eq("id", myCase.id)
  if (error) return { error: "We couldn't save that selection. Try again." }

  // Preserve partial answers, but make the category server-canonical and clear
  // carry-course data when the applicant chooses the home-only route.
  if (intake) {
    const prior = (intake.answers ?? {}) as Record<string, unknown>
    const normalized: Record<string, unknown> = {
      ...prior,
      applicationType,
      licenseType: applicationTypeToLegacyLicenseType(applicationType),
    }
    if (applicationType === "premise_residence") {
      normalized.residence = "nyc"
      delete normalized.trainingStatus
      delete normalized.trainingInstructor
      delete normalized.trainingDate
    }
    await admin
      .from("intake_sessions")
      .update({ answers: normalized as Json })
      .eq("case_id", myCase.id)
  }

  const jurisdiction = applicationType === "special_carry" ? "special_carry" : "nyc"
  await materializeCaseRequirements(
    admin,
    myCase.id,
    jurisdiction,
    applicationTypeToGeneratorAnswers(applicationType)
  )

  await logActivity({
    action: "case.application_type_selected",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
    detail: {
      from: myCase.application_type,
      to: applicationType,
      selected_at: selectedAt,
    },
  })

  revalidatePath("/portal", "layout")
  redirect("/portal/choose-path")
}
