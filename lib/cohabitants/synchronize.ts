import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { WizardAnswers } from "@/lib/intake/answers"
import { rematerializeCase } from "@/lib/requirements/rematerialize"
import { reconcileCohabitantRequirements } from "@/lib/cohabitants/process"
import { householdAnswersFromRoster } from "@/lib/cohabitants/household-state"

type DB = SupabaseClient<Database>

/**
 * Reconcile every household-dependent surface after a roster mutation.
 *
 * Service-role use is justified: this is system-derived synchronization across
 * the staff-owned requirement rows and the applicant-owned intake mirror. The
 * caller must authorize the case before invoking it.
 */
export async function synchronizeHouseholdCaseState(admin: DB, caseId: string) {
  const [{ data: roster, error: rosterError }, { data: session, error: sessionError }] = await Promise.all([
    admin
      .from("cohabitants")
      .select("name, relationship, contact_email, affidavit_status")
      .eq("case_id", caseId)
      .order("created_at"),
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
  ])
  if (rosterError) throw rosterError
  if (sessionError) throw sessionError

  const household = roster ?? []
  const current = (session?.answers ?? {}) as WizardAnswers
  const answers = householdAnswersFromRoster(current, household)
  const { error: intakeError } = await admin.from("intake_sessions").upsert(
    { case_id: caseId, answers: answers as never },
    { onConflict: "case_id" }
  )
  if (intakeError) throw intakeError

  // Ensure both mutually-exclusive requirement rows exist, then force the
  // inapplicable side to N/A even when an older document was once satisfied.
  // Evidence remains stored; only its applicability changes.
  await rematerializeCase(admin, caseId)
  return reconcileCohabitantRequirements(admin, caseId)
}

