/**
 * Phase 7 acceptance — Notifications & reminder engine.
 * Proves the gate test: the engine fires each due reminder exactly once
 * (reminder_log uniqueness), a re-run sends nothing new, in-app notifications
 * carry deep links, and a newly-due condition fires once and then no more.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p7.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { runReminderEngine } from "../lib/reminders/engine"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function count(table: "reminder_log" | "notifications"): Promise<number> {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true })
  return count ?? 0
}

async function main() {
  console.log("\n— Phase 7 verification —\n")

  // Clean baseline so the run is deterministic.
  await admin.from("reminder_log").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await admin.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  // ── Run 1: fires for the current seed state (rejected doc + open offer) ───
  const run1 = await runReminderEngine(tadmin)
  check(run1.length >= 1, `first run fires reminders (${run1.length}): ${[...new Set(run1.map((f) => f.ruleKey))].join(", ")}`)
  const log1 = await count("reminder_log")
  const notif1 = await count("notifications")
  check(log1 === run1.length, "every fired reminder wrote exactly one reminder_log row")

  const { data: linked } = await admin.from("notifications").select("id").not("link", "is", null).limit(1)
  check((linked ?? []).length > 0, "in-app notifications carry deep links")

  // ── Run 2: idempotent — nothing new ───────────────────────────────────────
  const run2 = await runReminderEngine(tadmin)
  check(run2.length === 0, "re-running the cron fires NOTHING new (idempotent)")
  check((await count("reminder_log")) === log1, "reminder_log count unchanged after the re-run")
  check((await count("notifications")) === notif1, "no duplicate notifications created")

  // ── A newly-due condition fires once, then no more ────────────────────────
  const { data: doc } = await admin
    .from("documents")
    .select("id")
    .eq("status", "approved")
    .limit(1)
    .single()
  await admin.from("documents").update({ status: "rejected" }).eq("id", doc!.id)

  const run3 = await runReminderEngine(tadmin)
  check(run3.length === 1 && run3[0].ruleKey === "doc_rejected", "a newly rejected document fires exactly one reminder")
  const run4 = await runReminderEngine(tadmin)
  check(run4.length === 0, "and fires nothing on the next run")
  await admin.from("documents").update({ status: "approved" }).eq("id", doc!.id)

  // ── The DB unique constraint is the real guard ────────────────────────────
  const { data: anyLog } = await admin.from("reminder_log").select("rule_key, target, window_key").limit(1).single()
  const dup = await admin.from("reminder_log").insert({ rule_key: anyLog!.rule_key, target: anyLog!.target, window_key: anyLog!.window_key })
  check(!!dup.error, "the reminder_log unique constraint rejects a duplicate (rule_key,target,window_key)")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 7\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
