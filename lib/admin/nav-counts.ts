import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { AdminNavKey } from "@/config/admin-nav"
import { buildQaQueue } from "@/lib/admin/queue"
import { conciergeAttentionCount } from "@/lib/concierge/queue"
import { loadToday } from "@/lib/admin/today"

type DB = SupabaseClient<Database>
export type AdminNavCounts = Partial<Record<AdminNavKey, number>>

export async function loadAdminNavCounts(db: DB, userId: string, role: string): Promise<AdminNavCounts> {
  const today = new Date()
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(today)
  const next = new Date(today.getTime() + 86_400_000).toISOString()
  const results = await Promise.allSettled([
    loadToday(db, { userId, role, scope: "mine", now: today }),
    db.from("messages").select("case_id, profiles:sender_id(role)").is("engagement_id", null).eq("read", false),
    Promise.all([
      db.from("appointments").select("id", { count: "exact", head: true }).gte("scheduled_at", `${date}T00:00:00-05:00`).lt("scheduled_at", next),
      db.from("bookings").select("id", { count: "exact", head: true }).neq("status", "cancelled").gte("starts_at", `${date}T00:00:00-05:00`).lt("starts_at", next),
    ]),
    buildQaQueue(db),
    conciergeAttentionCount(db),
    role === "admin" ? db.from("requirements").select("id", { count: "exact", head: true }).eq("needs_legal_review", true) : Promise.resolve({ count: 0 }),
    role === "admin" ? db.from("data_requests").select("id", { count: "exact", head: true }).in("status", ["open", "acknowledged"]) : Promise.resolve({ count: 0 }),
  ])

  const counts: AdminNavCounts = {}
  if (results[0].status === "fulfilled") counts.today = results[0].value.items.filter((item) => item.section === "overdue" || item.section === "today").length
  if (results[1].status === "fulfilled") {
    const unreadCases = new Set<string>()
    for (const row of results[1].value.data ?? []) {
      const profile = row.profiles as unknown as { role?: string } | null
      if (profile?.role === "client") unreadCases.add(row.case_id)
    }
    counts.inbox = unreadCases.size
  }
  if (results[2].status === "fulfilled") counts.calendar = (results[2].value[0].count ?? 0) + (results[2].value[1].count ?? 0)
  if (results[3].status === "fulfilled") counts.queue = results[3].value.filter((row) => row.bucket === "ready" || row.bucket === "signed").length
  if (results[4].status === "fulfilled") counts.concierge = results[4].value
  if (results[5].status === "fulfilled") counts.legal = results[5].value.count ?? 0
  if (results[6].status === "fulfilled") counts.privacy = results[6].value.count ?? 0
  return counts
}

