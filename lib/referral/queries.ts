import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * The referral channel's READ side — aggregate counts by default, and per-person STAGE
 * LABELS only for applicants who consented. Everything comes from SECURITY DEFINER RPCs
 * keyed on the caller's own sponsor_id, so a referrer only ever sees their own channel
 * and never touches an applicant's file. No sponsor view, no party_scope, no PII.
 */

export interface ReferralStats {
  introduced: number
  signedUp: number
  completed: number
}
export interface ReferralConsentedStage {
  caseId: string
  stage: string
}
export interface ReferralChannel {
  stats: ReferralStats
  /** Stage labels for the applicants who explicitly consented — never a name. */
  consented: ReferralConsentedStage[]
}

export async function loadReferralChannel(): Promise<ReferralChannel> {
  const db = await createClient()
  const [{ data: statRows }, { data: stageRows }] = await Promise.all([
    db.rpc("referral_channel_stats"),
    db.rpc("referral_consented_stages"),
  ])
  const s = (statRows ?? [])[0] as { introduced: number; signed_up: number; completed: number } | undefined
  return {
    stats: {
      introduced: Number(s?.introduced ?? 0),
      signedUp: Number(s?.signed_up ?? 0),
      completed: Number(s?.completed ?? 0),
    },
    consented: ((stageRows ?? []) as { case_id: string; stage: string }[]).map((r) => ({ caseId: r.case_id, stage: r.stage })),
  }
}
