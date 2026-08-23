import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MyCase } from "@/lib/portal"
import type { CaseStageKey } from "@/config/stages"

/**
 * Soft onboarding gate. A brand-new applicant is carried straight to the ONE
 * decision that shapes everything — the path fork — and then, for Self-Guided
 * only, into intake. A GENTLE nudge, not a trap:
 *
 *  - Fires only on EARLY-stage cases that haven't finished onboarding. Once a
 *    path is chosen (concierge) or intake is done, it never fires again.
 *  - Not yet forked → /portal/choose-path (the fork is the first thing they see).
 *  - Self-Guided, intake incomplete → /portal/intake.
 *  - FULL CONCIERGE → never forced into intake: we fill it out on their behalf,
 *    so a concierge applicant goes straight to their dashboard.
 *  - Account-safety pages (the fork, intake, profile, privacy) always reachable;
 *    an attorney-review case is never trapped.
 *
 * Returns the path to redirect to, or null to let the request through.
 */

// Stages where the applicant hasn't meaningfully started yet. Completing intake
// advances past `lead`, so a case still at `lead` is the "just signed up" case.
const EARLY_STAGES: CaseStageKey[] = ["lead"]

// Never gate these — the fork + intake are destinations, and details/profile/privacy
// are account-data pages that must always be reachable (a new applicant may open
// "Your details" to enter their facts before, or instead of stepping through, intake).
const EXEMPT_PREFIXES = [
  "/portal/choose-path",
  "/portal/intake",
  "/portal/details",
  "/portal/profile",
  "/portal/privacy",
]

/** Pure routing decision — the DB reads live in resolveOnboardingRedirect. */
export function decideOnboardingRedirect(input: {
  pathname: string
  serviceMode: string | null
  stage: CaseStageKey
  intakeCompleted: boolean
  hasAttorneyReview: boolean
}): string | null {
  const { pathname, serviceMode, stage, intakeCompleted, hasAttorneyReview } = input
  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  // Concierge never does intake — they go straight to their dashboard.
  if (serviceMode === "concierge") return null
  // Only nudge brand-new cases; anything that's moved on is left alone (this also
  // keeps legacy pre-fork cases mid-flight from being yanked to the fork).
  if (!EARLY_STAGES.includes(stage)) return null
  if (intakeCompleted) return null
  if (hasAttorneyReview) return null
  // Not yet forked → the fork is the first thing. Self-Guided → intake.
  return serviceMode ? "/portal/intake" : "/portal/choose-path"
}

export async function resolveOnboardingRedirect(
  pathname: string,
  myCase: MyCase
): Promise<string | null> {
  // Cheap, pure short-circuits first — avoid the DB reads when we already know.
  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  if (myCase.service_mode === "concierge") return null
  if (!EARLY_STAGES.includes(myCase.stage as CaseStageKey)) return null

  const supabase = await createClient()
  const { data: session } = await supabase
    .from("intake_sessions")
    .select("completed_at")
    .eq("case_id", myCase.id)
    .maybeSingle()

  // Attorney-review track: don't trap them (activity_log is staff-read RLS, so
  // this routing check reads the applicant's own case via the service role).
  const admin = createAdminClient()
  const { data: review } = await admin
    .from("activity_log")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("action", "intake.attorney_review_required")
    .limit(1)
    .maybeSingle()

  return decideOnboardingRedirect({
    pathname,
    serviceMode: myCase.service_mode ?? null,
    stage: myCase.stage as CaseStageKey,
    intakeCompleted: !!session?.completed_at,
    hasAttorneyReview: !!review,
  })
}
