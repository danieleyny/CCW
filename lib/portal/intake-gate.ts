import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MyCase } from "@/lib/portal"
import type { CaseStageKey } from "@/config/stages"

/**
 * Soft intake gate. A brand-new applicant who hasn't finished intake should be
 * carried straight into it — not dropped onto a half-empty portal whose checklist
 * hasn't been personalized yet. This is a GENTLE nudge, not a trap:
 *
 *  - It only fires on EARLY-stage cases with no completed intake. Once intake is
 *    done (or the case has moved past screening), it never fires again.
 *  - Account-safety pages (intake itself, profile, privacy) are always reachable.
 *  - A case flagged for attorney review is exempt — they may legitimately be
 *    waiting on us rather than able to finish, so we never trap them in intake.
 *
 * Returns true when the current request should be redirected to /portal/intake.
 */

// Stages where the applicant hasn't meaningfully started the guided work yet.
// Completing intake advances the case to `eligibility_screened`, so a case still
// sitting at `lead` with no intake is the exact "wandered off too early" case.
const EARLY_STAGES: CaseStageKey[] = ["lead"]

// Never gate these — intake is the destination, and profile/privacy are
// account-safety pages that must always be reachable.
const EXEMPT_PREFIXES = ["/portal/intake", "/portal/profile", "/portal/privacy"]

export async function shouldForceIntake(pathname: string, myCase: MyCase): Promise<boolean> {
  if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false
  if (!EARLY_STAGES.includes(myCase.stage as CaseStageKey)) return false

  const supabase = await createClient()

  // Already finished intake? Then there's nothing to force.
  const { data: session } = await supabase
    .from("intake_sessions")
    .select("completed_at")
    .eq("case_id", myCase.id)
    .maybeSingle()
  if (session?.completed_at) return false

  // Attorney-review track: don't trap them. Completing intake with a prohibitor
  // routes here and logs this action; if it's present they may be waiting on us.
  // activity_log is staff/admin-read only (RLS), so this routing check uses the
  // service role — a read of the applicant's own case, nothing exposed to them.
  const admin = createAdminClient()
  const { data: review } = await admin
    .from("activity_log")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("action", "intake.attorney_review_required")
    .limit(1)
    .maybeSingle()
  if (review) return false

  return true
}
