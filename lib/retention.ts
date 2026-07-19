/**
 * PART A / Phase 3 — the scheduled retention sweep.
 *
 * ⚖ THIS DOES NOTHING UNTIL COUNSEL SETS A WINDOW, by design. Firearms-licensing
 * records may carry statutory retention MINIMUMS as well as maximums, and that
 * determination is not ours to guess. Every `retention_policies` row ships
 * `enabled = false` with `retain_days = null`, and this function additionally
 * refuses to act unless a policy is both enabled and has a window — two
 * independent offs, so neither a stray UPDATE nor a bad default starts deleting.
 *
 * No `server-only`: the cron wrapper and the verify harness both drive it.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface RetentionResult {
  /** Set when nothing ran, with the reason — an honest no-op, not a silent one. */
  skipped?: string
  purged: Record<string, number>
}

function cutoff(now: Date, days: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

export async function runRetention(db: DB, now = new Date()): Promise<RetentionResult> {
  const purged: Record<string, number> = {}

  const { data: policies } = await db
    .from("retention_policies")
    .select("key, retain_days, enabled, action")
    .eq("enabled", true)
    .not("retain_days", "is", null)

  const live = policies ?? []
  if (live.length === 0) {
    return { skipped: "disabled", purged }
  }

  // Once per day, even though the cron ticks hourly. reminder_log is already the
  // house idempotency ledger — same (rule_key, target, window_key) upsert that
  // fireOnce trusts, so a re-run within the day is a no-op rather than a second
  // sweep.
  const windowKey = now.toISOString().slice(0, 10)
  const { data: claimed } = await db
    .from("reminder_log")
    .upsert(
      { rule_key: "retention_sweep", target: "system", window_key: windowKey, case_id: null },
      { onConflict: "rule_key,target,window_key", ignoreDuplicates: true }
    )
    .select("id")
  if (!claimed || claimed.length === 0) {
    return { skipped: "already_ran_today", purged }
  }

  for (const p of live) {
    const before = cutoff(now, p.retain_days as number)

    if (p.key === "notification") {
      const { data } = await db.from("notifications").delete().lt("created_at", before).select("id")
      purged.notifications = data?.length ?? 0
    }

    if (p.key === "reminder_log") {
      // Never sweep the row claiming today's sweep.
      const { data } = await db
        .from("reminder_log")
        .delete()
        .lt("created_at", before)
        .neq("rule_key", "retention_sweep")
        .select("id")
      purged.reminder_log = data?.length ?? 0
    }

    if (p.key === "abandoned_intake") {
      // Only intakes never completed, and only on cases with no engagement —
      // an abandoned lead, not a paused applicant.
      const { data: stale } = await db
        .from("intake_sessions")
        .select("id, case_id")
        .is("completed_at", null)
        .lt("created_at", before)
      let n = 0
      for (const s of stale ?? []) {
        const { count: engaged } = await db
          .from("engagements")
          .select("id", { count: "exact", head: true })
          .eq("case_id", s.case_id)
        if ((engaged ?? 0) > 0) continue
        await db.from("intake_sessions").delete().eq("id", s.id)
        n++
      }
      purged.abandoned_intake = n
    }

    // 'closed_case' is intentionally NOT implemented as an automatic purge.
    // Minimizing a closed case's disclosure content is the highest-consequence
    // action in this file and the one most likely to collide with a retention
    // minimum. It stays a deliberate, recorded act through lib/privacy/erase.ts
    // until counsel has set the window and signed off on automating it.
    if (p.key === "closed_case") {
      purged.closed_case_skipped = 0
    }
  }

  return { purged }
}
