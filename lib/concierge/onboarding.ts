import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { REQUIRED_AGREEMENT_KINDS, currentAgreementVersion } from "@/config/agreements"

type DB = SupabaseClient<Database>

export interface IntroCallState {
  status: string
  scheduledAt: string | null
  joinUrl: string | null
}

export interface ConciergeOnboardingState {
  /** Every required agreement kind is signed at its CURRENT version. */
  agreementsSigned: boolean
  /** Kinds still needing a current-version signature. */
  missingKinds: string[]
  introCall: IntroCallState | null
}

/**
 * The concierge onboarding gate state, read from real rows. Agreements are
 * "signed" only when EVERY required kind has a row at its current config version
 * — a version bump automatically re-opens the gate for that agreement.
 */
export async function loadConciergeOnboarding(
  db: DB,
  caseId: string
): Promise<ConciergeOnboardingState> {
  const [{ data: agreements }, { data: intro }] = await Promise.all([
    db.from("case_agreements").select("kind, version").eq("case_id", caseId),
    db
      .from("intro_calls")
      .select("status, scheduled_at, join_url")
      .eq("case_id", caseId)
      .maybeSingle(),
  ])

  const signed = new Set((agreements ?? []).map((a) => `${a.kind}@${a.version}`))
  const missingKinds = REQUIRED_AGREEMENT_KINDS.filter(
    (kind) => !signed.has(`${kind}@${currentAgreementVersion(kind)}`)
  )

  return {
    agreementsSigned: missingKinds.length === 0,
    missingKinds,
    introCall: intro
      ? { status: intro.status, scheduledAt: intro.scheduled_at, joinUrl: intro.join_url }
      : null,
  }
}
