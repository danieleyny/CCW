import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/**
 * CONCIERGE Phase 9 — on-behalf attribution. On a concierge (done-for-you) case,
 * a staff action IS work done on the applicant's behalf. These helpers stamp
 * `detail.on_behalf` into the activity log so the audit trail — and the case-file
 * activity feed — makes that explicit and queryable. (The staff-gated admin
 * actions are the only callers, so "staff acting on a concierge case" is exactly
 * on-behalf work.)
 */
export async function isConciergeCase(db: DB, caseId: string): Promise<boolean> {
  const { data } = await db.from("cases").select("service_mode").eq("id", caseId).maybeSingle()
  return data?.service_mode === "concierge"
}

/** Merge `on_behalf: true` into an activity detail when the case is concierge. */
export async function withOnBehalf<T extends Record<string, unknown>>(
  db: DB,
  caseId: string,
  detail: T
): Promise<T & { on_behalf?: true }> {
  return (await isConciergeCase(db, caseId)) ? { ...detail, on_behalf: true as const } : detail
}
