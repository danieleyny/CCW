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
 * CONCIERGE QA Phase 7 — THE single definition of "agreements signed". Agreements
 * are complete only when EVERY required kind has a row at its CURRENT config
 * version, so a version bump (which config/agreements.ts is explicitly built for,
 * and which attorney review will cause) re-opens the gate. The gate, the work
 * queue, and the reminders engine ALL call this — never a raw row count, which
 * would report a stale-version case as signed while its dashboard is locked.
 */
export function agreementsCurrentFor(
  rows: { kind: string; version: number }[]
): { complete: boolean; missing: string[] } {
  const signed = new Set(rows.map((a) => `${a.kind}@${a.version}`))
  const missing = REQUIRED_AGREEMENT_KINDS.filter(
    (kind) => !signed.has(`${kind}@${currentAgreementVersion(kind)}`)
  )
  return { complete: missing.length === 0, missing }
}

/**
 * The concierge onboarding gate state, read from real rows.
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

  const { complete, missing } = agreementsCurrentFor(agreements ?? [])

  return {
    agreementsSigned: complete,
    missingKinds: missing,
    introCall: intro
      ? { status: intro.status, scheduledAt: intro.scheduled_at, joinUrl: intro.join_url }
      : null,
  }
}
