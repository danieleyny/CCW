import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { notifyClient } from "@/lib/email"

/**
 * Nudge clients whose documents were rejected (need a re-upload). Runs with the
 * service-role client (cron context, no user session). Email/SMS are stubbed
 * until provider keys are set. Idempotency in production would track last-sent;
 * here we simply act on current state.
 */
export async function runReminders() {
  const admin = createAdminClient()

  const { data: rejected } = await admin
    .from("documents")
    .select("type, clients(full_name, email)")
    .eq("status", "rejected")

  let sent = 0
  for (const d of rejected ?? []) {
    const client = d.clients as unknown as { full_name: string; email: string | null } | null
    if (!client?.email) continue
    await notifyClient({
      to: client.email,
      subject: "Action needed: a document needs a fix",
      body: `Hi ${client.full_name}, your ${d.type.replace(/_/g, " ")} needs a quick re-upload. Open your CARRY portal to take care of it.`,
    })
    sent++
  }

  // Overdue staff tasks (surfaced count; staff see these in Today).
  const today = new Date().toISOString().slice(0, 10)
  const { count: overdueTasks } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .lt("due_date", today)

  return { documentRemindersSent: sent, overdueTasks: overdueTasks ?? 0 }
}
