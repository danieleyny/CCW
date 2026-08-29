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
import { FirearmsRecords } from "@/components/portal/facts/firearms-records"
import { AddressSplits, type AddressSplitInput } from "@/components/portal/facts/address-splits"
import type { WizardAnswers } from "@/lib/intake/answers"

export const metadata = { title: "Your details" }

const GROUP_ORDER: FactGroup[] = ["you", "address", "contact", "physical", "employer", "safeguard", "safekeeping", "counsel", "sponsor"]

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

  // Portal building/street splits — parse each stored single-line street, flagged for
  // confirmation. Safeguard's address is a free-form line; still worth splitting.
  const fx = (k: string) => facts[k] ?? ""
  const addressSplits: AddressSplitInput[] = [
    { prefix: "applicant.address", label: "Home address", street: fx("applicant.address.street"), buildingNumber: fx("applicant.address.buildingNumber"), streetName: fx("applicant.address.streetName"), confirmed: fx("applicant.address.streetConfirmed") === "yes" },
    { prefix: "applicant.mailing", label: "Mailing address", street: fx("applicant.mailing.street"), buildingNumber: fx("applicant.mailing.buildingNumber"), streetName: fx("applicant.mailing.streetName"), confirmed: fx("applicant.mailing.streetConfirmed") === "yes" },
    { prefix: "employer.address", label: "Employer address", street: fx("employer.address.street"), buildingNumber: fx("employer.address.buildingNumber"), streetName: fx("employer.address.streetName"), confirmed: fx("employer.address.streetConfirmed") === "yes" },
    { prefix: "safeguard", label: "Safeguard person's address", street: fx("safeguard.street") || fx("safeguard.address"), buildingNumber: fx("safeguard.buildingNumber"), streetName: fx("safeguard.streetName"), confirmed: fx("safeguard.streetConfirmed") === "yes" },
    { prefix: "safekeeping", label: "Safekeeping location", street: fx("safekeeping.street"), buildingNumber: fx("safekeeping.buildingNumber"), streetName: fx("safekeeping.streetName"), confirmed: fx("safekeeping.streetConfirmed") === "yes" },
  ]

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

      <AddressSplits caseId={myCase.id} addresses={addressSplits} />

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

      <FirearmsRecords
        caseId={myCase.id}
        firearms={intake.firearms ?? []}
        otherLicenses={intake.otherLicenses ?? []}
      />
    </div>
  )
}
