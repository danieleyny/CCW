import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { notifyClient } from "@/lib/email"
import { runReminderEngine } from "@/lib/reminders/engine"

/**
 * Daily cron entry point. The engine does the idempotent work (reminder_log gate
 * + in-app notifications); here we layer email on the notifications that actually
 * fired this run, so a re-run sends nothing (the engine returns an empty list).
 */
export async function runReminders() {
  const admin = createAdminClient()
  const fired = await runReminderEngine(admin)

  let emailed = 0
  for (const f of fired) {
    if (f.email) {
      await notifyClient({ to: f.email, subject: f.title, body: f.body, cta: f.cta })
      emailed++
    }
  }

  // Per-rule counts for the cron response.
  const byRule: Record<string, number> = {}
  for (const f of fired) byRule[f.ruleKey] = (byRule[f.ruleKey] ?? 0) + 1

  return { notificationsFired: fired.length, emailed, byRule }
}
