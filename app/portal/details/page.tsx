import { redirect } from "next/navigation"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFacts } from "@/lib/facts/resolve"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { type FactGroup } from "@/lib/facts/registry"
import { buildFactGroups } from "@/lib/facts/details-view"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { FactGroups } from "@/components/portal/facts/fact-groups"
import { ApplicationHistory } from "@/components/portal/facts/application-history"
import type { WizardAnswers } from "@/lib/intake/answers"

export const metadata = { title: "Your details" }

const GROUP_ORDER: FactGroup[] = ["you", "address", "contact", "physical", "employer", "safeguard", "sponsor"]

/**
 * "Your details" — the preparation form. Every reusable fact captured once, edited
 * in place, propagated to every form. Enter your details here and every
 * questionnaire afterward is nearly empty.
 */
export default async function DetailsPage() {
  const myCase = await getMyCase()
  if (!myCase) redirect("/portal")
  const db = await createClient()
  const facts = await resolveFacts(db, myCase.id)
  const hasSsn = await hasCaseSsn(createAdminClient(), myCase.id)
  // The repeatable Q29 histories + Q9 out-of-city licence live in intake_sessions,
  // not the scalar fact layer — load them for the "Application history" section.
  const { data: intakeRow } = await db.from("intake_sessions").select("answers").eq("case_id", myCase.id).maybeSingle()
  const intake = (intakeRow?.answers ?? {}) as WizardAnswers

  // Rows built server-side (registry + form-usage counts stay off the client); the
  // meter and inline saves are then driven from client state.
  const { groups: groupData, total } = buildFactGroups(facts, hasSsn, GROUP_ORDER, true)

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Prepared once, reused everywhere</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your details</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Everything the NYPD forms ask for, in one place. Correct something here and it&apos;s corrected on
          every form that uses it — so your questionnaires stay nearly empty.
        </p>
      </div>

      <FactGroups caseId={myCase.id} groups={groupData} total={total} showMeter />

      <ApplicationHistory
        caseId={myCase.id}
        residence={intake.residenceHistory ?? []}
        employment={intake.employmentHistory ?? []}
        outOfCity={{
          number: intake.outOfCityLicenseNumber ?? "",
          county: intake.outOfCityCounty ?? "",
          issuedOn: intake.outOfCityIssuedOn ?? "",
          expiresOn: intake.outOfCityExpiresOn ?? "",
        }}
      />
    </div>
  )
}
