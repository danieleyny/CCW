"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { retireOtherJurisdictionRequirements } from "@/lib/requirements/materialize"
import { rematerializeCase } from "@/lib/requirements/rematerialize"
import {
  APPLICANT_SELECTABLE_APPLICATION_TYPES,
  applicationTypeToLegacyLicenseType,
  type ApplicantSelectableApplicationType,
} from "@/lib/application-types"
import type { Json } from "@/lib/supabase/types"

const schema = z.object({
  applicationType: z.enum(APPLICANT_SELECTABLE_APPLICATION_TYPES),
  returnTo: z.enum(["choose-path", "license"]).default("choose-path"),
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
  const parsed = schema.safeParse({
    applicationType: formData.get("applicationType"),
    returnTo: formData.get("returnTo") || "choose-path",
  })
  if (!parsed.success) return { error: "Choose the option that matches what you want to apply for." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }

  const admin = createAdminClient()
  const [
    { data: intake },
    { count: documentCount },
    { count: referenceCount },
    { count: cohabitantCount },
    { count: preparedAnswerCount },
    { count: completedRequirementCount },
  ] = await Promise.all([
    admin
      .from("intake_sessions")
      .select("answers, completed_at")
      .eq("case_id", myCase.id)
      .maybeSingle(),
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id),
    admin
      .from("character_references")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id),
    admin
      .from("cohabitants")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id),
    admin
      .from("requirement_answers")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id),
    admin
      .from("case_requirements")
      .select("id", { count: "exact", head: true })
      .eq("case_id", myCase.id)
      .in("status", ["satisfied", "rejected"]),
  ])

  const categoryChanged = myCase.application_type !== parsed.data.applicationType
  const earlyStage =
    myCase.stage === "lead" ||
    myCase.stage === "eligibility_screened" ||
    myCase.stage === "signed_up_paid"
  const attachedWorkCount =
    (documentCount ?? 0) +
    (referenceCount ?? 0) +
    (cohabitantCount ?? 0) +
    (preparedAnswerCount ?? 0) +
    (completedRequirementCount ?? 0)
  if (categoryChanged && (!earlyStage || !!intake?.completed_at || attachedWorkCount > 0)) {
    return {
      error:
        "Your case already has application work attached. Message your concierge before changing the license type so nothing is lost or misclassified.",
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

  // clients.track is the legacy audience/routing value. Keep it aligned for
  // Special Carry so older portal and reporting code does not continue to
  // treat an outside-NYC applicant as a resident while application_type and
  // the requirements engine say otherwise. Preserve a real business track;
  // only unwind non_resident when the applicant leaves Special Carry.
  const nextClientTrack = applicationType === "special_carry"
    ? "non_resident"
    : myCase.client.track === "non_resident"
      ? "resident"
      : null
  if (nextClientTrack) {
    const { error: trackError } = await admin
      .from("clients")
      .update({ track: nextClientTrack })
      .eq("id", myCase.client_id)
    if (trackError) throw trackError
  }

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
    } else if (applicationType === "special_carry") {
      normalized.residence = "non_resident"
    } else if (normalized.residence === "non_resident") {
      normalized.residence = "nyc"
    }
    await admin
      .from("intake_sessions")
      .update({ answers: normalized as Json })
      .eq("case_id", myCase.id)
  }

  const jurisdiction = applicationType === "special_carry" ? "special_carry" : "nyc"
  const retiredRequirements = categoryChanged
    ? await retireOtherJurisdictionRequirements(admin, myCase.id, jurisdiction)
    : 0
  await rematerializeCase(admin, myCase.id)

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
      retired_other_jurisdiction_requirements: retiredRequirements,
    },
  })

  revalidatePath("/portal", "layout")
  redirect(parsed.data.returnTo === "license" ? "/portal/license" : "/portal/choose-path")
}
