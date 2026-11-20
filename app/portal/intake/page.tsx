import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyCase } from "@/lib/portal"
import { evaluateSubmissionGuard } from "@/lib/intake/process"
import type { WizardAnswers } from "@/lib/intake/answers"
import { ensureIntakeSession } from "./actions"
import { IntakeWizard } from "@/components/portal/intake/intake-wizard"
import { AI_ENABLED } from "@/lib/ai"
import { redirect } from "next/navigation"
import { getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import {
  applicationTypeToLegacyLicenseType,
  isPremisesApplication,
  type ApplicationType,
} from "@/lib/application-types"

export const metadata = { title: "Application intake" }

export default async function IntakePage() {
  const [myCase, t] = await Promise.all([getMyCase(), getMessages()])
  if (!myCase) {
    return (
      <p className="portal-intake-no-case">
        {t.portal.intake.noCase}
      </p>
    )
  }

  // A sponsored (company-referred) applicant completes their OWN intake — the sponsor
  // never supplies the applicant's identity or disclosures. Show a clear first-run
  // prompt explaining why the interview comes first.
  const admin = createAdminClient()
  const { data: sp } = await admin
      .from("case_sponsorships")
      .select("sponsor:sponsors(legal_name)")
      .eq("case_id", myCase.id)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle()
  if (!myCase.application_type && !sp) redirect("/portal/license-path")

  const session = await ensureIntakeSession(myCase.id)
  const completed = !!session.completed_at

  let sponsorName: string | null = null
  if (!completed) {
    sponsorName = (sp?.sponsor as unknown as { legal_name?: string } | null)?.legal_name ?? null
    if (sp && !sponsorName) sponsorName = "your sponsoring company"
  }

  // V3-P4.4 — carry the eligibility-quiz answers into intake: a brand-new
  // session prefills residence + training status from what the lead already
  // told us, so nobody answers the same question twice.
  let initialAnswers = (session.answers ?? {}) as WizardAnswers
  if (!completed && Object.keys(initialAnswers).length === 0) {
    const supabase0 = await createClient()
    const { data: clientRow } = await supabase0
      .from("clients")
      .select("eligibility")
      .eq("id", myCase.client_id)
      .single()
    const quiz = (clientRow?.eligibility ?? {}) as Record<string, string>
    const prefill: WizardAnswers = {}
    if (quiz.location === "non_resident") prefill.residence = "non_resident"
    else if (quiz.location) prefill.residence = "nyc"
    if (!isPremisesApplication(myCase.application_type as ApplicationType | null)) {
      if (quiz.training === "done") prefill.trainingStatus = "completed"
      else if (quiz.training) prefill.trainingStatus = "planned"
    }
    initialAnswers = prefill
  }
  // ZIP already exists on the applicant record from onboarding. Carry it into
  // the exact address the applicant reviews here, while preserving any explicit
  // intake edit. This avoids asking them twice without making the older client
  // column the only possible source forever.
  initialAnswers = {
    ...initialAnswers,
    ...(myCase.application_type
      ? {
          applicationType: myCase.application_type as ApplicationType,
          licenseType: applicationTypeToLegacyLicenseType(myCase.application_type as ApplicationType),
        }
      : {}),
    legalZip: initialAnswers.legalZip ?? myCase.client.zip ?? undefined,
  }
  if (isPremisesApplication(myCase.application_type as ApplicationType | null)) {
    initialAnswers = {
      ...initialAnswers,
      residence: "nyc",
      trainingStatus: undefined,
      trainingInstructor: undefined,
      trainingDate: undefined,
    }
  } else if (myCase.application_type === "special_carry") {
    initialAnswers = { ...initialAnswers, residence: "non_resident", licenseType: "carry" }
  } else if (myCase.application_type === "concealed_carry") {
    initialAnswers = { ...initialAnswers, residence: "nyc", licenseType: "carry" }
  }

  let disclosures: { id: string; type: string; narrative: string; question_no: number | null }[] = []
  let guard = null
  if (completed) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("disclosures")
      .select("id, type, narrative, question_no")
      .eq("case_id", myCase.id)
      .order("type", { ascending: true })
    disclosures = data ?? []
    // Guard is computed with the service-role client so the pending-requirements
    // count reflects every requirement, matching what generation produced.
    guard = await evaluateSubmissionGuard(createAdminClient(), myCase.id)
  }

  // The applicant's own identity, so the safeguard step can flag "this can't be you"
  // (NYPD step 7). Split the client's full name into first/last for the detector.
  const nameToks = (myCase.client.full_name ?? "").trim().split(/\s+/).filter(Boolean)
  const applicant = {
    firstName: nameToks[0] ?? "",
    lastName: nameToks.length > 1 ? nameToks[nameToks.length - 1] : "",
    email: myCase.client.email ?? "",
    phone: myCase.client.phone ?? "",
  }

  return (
    <div className="portal-intake-page">
      {sponsorName && (
        <div className="portal-intake-sponsor">
          <p>{t.portal.intake.sponsorTitle}</p>
          <p>
            {interpolate(t.portal.intake.sponsorBody, { sponsor: sponsorName })}
          </p>
        </div>
      )}
      <IntakeWizard
        caseId={myCase.id}
        isRenewal={!!myCase.is_renewal}
        initialAnswers={initialAnswers}
        initialStep={session.current_step ?? 1}
        completed={completed}
        disclosures={disclosures}
        guard={guard}
        aiEnabled={AI_ENABLED}
        applicant={applicant}
        licenseTrack={(myCase.license_track as string | null) ?? null}
        applicationType={(myCase.application_type as ApplicationType | null) ?? null}
        copy={t.portal.intake}
      />
    </div>
  )
}
