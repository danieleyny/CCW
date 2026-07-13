/**
 * V4-A4f — government fees live in the `fees` table (admin-writable), so a fee
 * change is a data edit, not a redeploy. Everything customer-facing that quotes
 * "$340" / "$88.25" now reads from here. No `server-only` so scripts and the
 * verify harness can read it too.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface Fees {
  /** e.g. "$340" (whole dollars trimmed) */
  applicationFee: string
  /** e.g. "$88.25" */
  fingerprintFee: string
  /** application + fingerprint, e.g. "$428.25" */
  combined: string
  applicationCents: number
  fingerprintCents: number
}

// Sensible fallbacks if the table is unreachable — matches the seeded values,
// so a page never renders a blank fee. The DB remains the source of truth.
const FALLBACK = { nypd_application: 34000, dcjs_fingerprint: 8825 }

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`
}

export async function getFees(db: DB): Promise<Fees> {
  const { data } = await db.from("fees").select("key, amount_cents").eq("active", true)
  const byKey = new Map((data ?? []).map((f) => [f.key, f.amount_cents]))
  const applicationCents = byKey.get("nypd_application") ?? FALLBACK.nypd_application
  const fingerprintCents = byKey.get("dcjs_fingerprint") ?? FALLBACK.dcjs_fingerprint
  return {
    applicationFee: usd(applicationCents),
    fingerprintFee: usd(fingerprintCents),
    combined: usd(applicationCents + fingerprintCents),
    applicationCents,
    fingerprintCents,
  }
}
