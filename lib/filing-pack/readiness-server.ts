import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { MyCase } from "@/lib/portal"
import type { WizardAnswers } from "@/lib/intake/answers"
import { resolveFacts } from "@/lib/facts/resolve"
import {
  buildFactGroups,
  DETAIL_FACT_GROUPS,
  requiredVisibleFacts,
} from "@/lib/facts/details-view"
import type { FactGroup } from "@/lib/facts/registry"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { actionFor, actionWetInk } from "@/lib/requirements/actions"
import { buildPortalForms } from "@/lib/forms/portal-forms"
import {
  computeFilingPackReadiness,
  requirementDestination,
  type FilingPackReadiness,
  type FilingPackServiceMode,
  type ReadinessUnit,
} from "@/lib/filing-pack/readiness"

type DB = SupabaseClient<Database>

/**
 * Loads the existing case facts, requirements, form rows, people rosters and
 * histories, then evaluates only those sources. No filing rule lives here.
 */
export async function getFilingPackOutstanding(db: DB, myCase: MyCase): Promise<FilingPackReadiness> {
  const [view, facts, { data: intakeRow }, { data: sponsorship }] = await Promise.all([
    loadRequirementView(db, myCase),
    resolveFacts(db, myCase.id),
    db.from("intake_sessions").select("answers").eq("case_id", myCase.id).maybeSingle(),
    db
      .from("case_sponsorships")
      .select("id")
      .eq("case_id", myCase.id)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle(),
  ])

  const answers = (intakeRow?.answers ?? {}) as WizardAnswers
  const groupOrder: FactGroup[] = sponsorship ? [...DETAIL_FACT_GROUPS, "sponsor"] : DETAIL_FACT_GROUPS
  // The details meter does not count the encrypted SSN as an editable answer, so
  // the gate passes false here and uses the exact same editable-row rules.
  const factGroups = buildFactGroups(facts, false, groupOrder, false, !!myCase.is_renewal).groups
  const details: ReadinessUnit[] = requiredVisibleFacts(factGroups).map((fact) => ({
    label: fact.label,
    sub: fact.section,
    href: `/portal/details#fact-${fact.key}`,
    destination: "Your details",
    complete: fact.complete,
  }))

  const serviceMode: FilingPackServiceMode = myCase.service_mode === "concierge" ? "concierge" : "self_guided"
  const applicable = view.items.filter((item) => item.status !== "na" && !item.sponsorManaged)
  const documents: ReadinessUnit[] = applicable
    .filter((item) => {
      const action = actionFor(item.reqCode)
      return action?.mode === "obtain" && !action.optional
    })
    .map((item) => ({
      label: actionFor(item.reqCode)?.customerTitle ?? item.title,
      sub: "Upload",
      href: requirementDestination(serviceMode, item.reqCode),
      destination: serviceMode === "concierge" ? "Your concierge" : "Your checklist",
      complete: item.status === "satisfied",
    }))

  const statusByRequirement = new Map(view.items.map((item) => [item.reqCode, item.status]))
  const catalogByRequirement = new Map(
    buildPortalForms(answers, statusByRequirement)
      .filter((form) => !form.optional)
      .map((form) => [form.reqCode, form])
  )
  const forms: ReadinessUnit[] = applicable
    .filter((item) => {
      const action = actionFor(item.reqCode)
      return action?.mode === "generate" && !action.optional
    })
    .map((item) => {
      const action = actionFor(item.reqCode)!
      const form = catalogByRequirement.get(item.reqCode)
      const wetInk = actionWetInk(action)
      return {
        label: form?.title ?? action.customerTitle ?? item.title,
        sub: form?.fileable
          ? "Sign and file"
          : wetInk === "notary"
            ? "Notarize and upload"
            : wetInk === "witness"
              ? "Witness and upload"
              : "Review and sign",
        href: form ? `/portal/forms#form-${form.key}` : requirementDestination(serviceMode, item.reqCode),
        destination: form
          ? "Your forms"
          : serviceMode === "concierge"
            ? "Your concierge"
            : "Your checklist",
        complete: item.status === "satisfied",
      }
    })

  const people: ReadinessUnit[] = []
  if (view.referenceProgress) {
    const listed = Math.min(view.referenceProgress.people.length, view.referenceProgress.required)
    for (let index = 0; index < view.referenceProgress.required; index++) {
      people.push({
        label: index === 0 ? "Character references" : `Character reference ${index + 1}`,
        sub: `${listed} of ${view.referenceProgress.required} listed`,
        href: "/portal/people?tab=references",
        destination: "People · References",
        complete: index < listed,
      })
    }
  }
  const requiredCohabitants = answers.cohabitants?.length ?? 0
  if (requiredCohabitants > 0) {
    const listed = Math.min(view.cohabitantProgress?.people.length ?? 0, requiredCohabitants)
    for (let index = 0; index < requiredCohabitants; index++) {
      people.push({
        label: index === 0 ? "Household affidavits" : `Household affidavit ${index + 1}`,
        sub: `${listed} of ${requiredCohabitants} listed`,
        href: "/portal/people?tab=household",
        destination: "People · Household",
        complete: index < listed,
      })
    }
  }

  const residenceComplete = (answers.residenceHistory?.length ?? 0) > 0
  const employmentComplete = (answers.employmentHistory?.length ?? 0) > 0
  const history: ReadinessUnit[] = [
    {
      label: "Residence history",
      sub: "Five-year address history",
      href: "/portal/details#history",
      destination: "Your details · History",
      complete: residenceComplete,
    },
    {
      label: "Employment history",
      sub: "Five-year work history",
      href: "/portal/details#history",
      destination: "Your details · History",
      complete: employmentComplete,
    },
  ]

  return computeFilingPackReadiness({ details, documents, forms, people, history })
}
