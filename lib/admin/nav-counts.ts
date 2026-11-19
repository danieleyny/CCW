import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { AdminNavKey } from "@/config/admin-nav"
import { buildQaQueue } from "@/lib/admin/queue"
import { conciergeAttentionCount } from "@/lib/concierge/board"
import { loadToday } from "@/lib/admin/today"
import { ruleReviewCounts } from "@/lib/admin/rule-review"
import { privacyCounts } from "@/lib/admin/privacy"

type DB = SupabaseClient<Database>
export type AdminNavCounts = Partial<Record<AdminNavKey, number>>

export async function loadAdminNavCounts(db: DB, userId: string, role: string): Promise<AdminNavCounts> {
  const today = new Date()
  const results = await Promise.allSettled([
    loadToday(db, { userId, role, scope: "mine", now: today }),
    Promise.resolve(null),
    Promise.resolve(null),
    buildQaQueue(db),
    conciergeAttentionCount(db, userId),
    role === "admin" ? ruleReviewCounts(db) : Promise.resolve({ attention: 0 }),
    privacyCounts(db, today),
  ])

  const counts: AdminNavCounts = {}
  if (results[0].status === "fulfilled") {
    counts.today = results[0].value.items.filter((item) => item.section === "overdue" || item.section === "today").length
    counts.inbox = results[0].value.inboxNeedsReplyCount
    counts.calendar = results[0].value.schedule.length
  }
  if (results[3].status === "fulfilled") counts.queue = results[3].value.filter((row) => row.bucket === "ready" || row.bucket === "signed").length
  if (results[4].status === "fulfilled") counts.concierge = results[4].value
  if (results[5].status === "fulfilled") counts.legal = results[5].value.attention
  if (results[6].status === "fulfilled") counts.privacy = results[6].value.total
  return counts
}

