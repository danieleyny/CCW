/**
 * SYSTEM-VERIFIED CONTROLS.
 *
 * Some requirements were never really the customer's task. FMT-01 asked them to
 * "confirm" that their uploads meet the NYPD portal's file limits — a thing the
 * uploader already enforces on every file. ELG-01/02/03 and OOS-02 asked them to
 * re-confirm answers they had just given in intake. Asking twice is busywork,
 * and it quietly moves responsibility for a machine check onto a person.
 *
 * So the code that does the verifying satisfies the requirement, and the
 * customer checklist hides these items (admin/QA still sees them, with a note
 * saying how they were verified — never a bare "satisfied" with no provenance).
 *
 * HONESTY RULE: only satisfy when the underlying answer actually supports it. An
 * intake that reports a disqualifier leaves ELG-03 pending for a human. Nothing
 * here may make a case look cleaner than the applicant's own answers.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { WizardAnswers } from "@/lib/intake/answers"
import { REQUIREMENT_ACTIONS } from "@/lib/requirements/actions"

type DB = SupabaseClient<Database>

/** Requirement codes the system verifies rather than asking the customer. */
export const SYSTEM_VERIFIED_CODES = Object.entries(REQUIREMENT_ACTIONS)
  .filter(([, a]) => a.systemVerified)
  .map(([code]) => code)

export function isSystemVerified(reqCode: string): boolean {
  return !!REQUIREMENT_ACTIONS[reqCode]?.systemVerified
}

/**
 * Satisfy a system control, recording HOW it was verified. Never downgrades and
 * never touches a rejected row — a staffer's rejection outranks a machine check.
 */
export async function satisfySystemRequirement(
  admin: DB,
  caseId: string,
  reqCode: string
): Promise<void> {
  const note = REQUIREMENT_ACTIONS[reqCode]?.systemVerified
  if (!note) throw new Error(`${reqCode} is not a system-verified requirement`)

  await admin
    .from("case_requirements")
    .update({ status: "satisfied", notes: note })
    .eq("case_id", caseId)
    .eq("req_code", reqCode)
    .in("status", ["pending"])
}

/** Age in whole years on today's date, or null if the DOB is unusable. */
function ageFrom(dob: string | undefined): number | null {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getUTCFullYear() - d.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
  return beforeBirthday ? age - 1 : age
}

/**
 * The intake-derived controls. Each predicate reads the applicant's OWN answers;
 * anything the answers don't support is left pending for a human to look at.
 */
export function intakeSystemVerdicts(answers: WizardAnswers): string[] {
  const age = ageFrom(answers.dob)
  const checks: [string, boolean][] = [
    // ELG-01 — 21 or older, computed from the DOB they gave.
    ["ELG-01", age !== null && age >= 21],
    // ELG-02 — NYC residence (a non-resident routes to Special Carry, where the
    // jurisdiction profile asks a different question; leave it to a human).
    ["ELG-02", answers.residence === "nyc"],
    // ELG-03 — every prohibitor answered NO. A single yes (or an unanswered
    // question) leaves this pending: we never clear a disqualifier by default.
    [
      "ELG-03",
      answers.prohibitorFelony === false &&
        answers.prohibitorMentalHealth === false &&
        answers.prohibitorActiveOop === false &&
        answers.prohibitorUnlawfulDrug === false,
    ],
    // OOS-02 — they answered the out-of-state licence question either way. The
    // control is "it was disclosed", not "the answer was no".
    ["OOS-02", typeof answers.hasOtherLicense === "boolean"],
  ]

  return checks.filter(([, ok]) => ok).map(([code]) => code)
}

/** Apply the intake verdicts to a case. */
export async function runIntakeSystemChecks(
  admin: DB,
  caseId: string,
  answers: WizardAnswers
): Promise<string[]> {
  const codes = intakeSystemVerdicts(answers)
  for (const code of codes) await satisfySystemRequirement(admin, caseId, code)
  return codes
}
