import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  summarizeRuleReview,
  type RuleReviewCounts,
  type RuleReviewVersionState,
} from "@/lib/admin/rule-review-model"

export type { RuleReviewCounts } from "@/lib/admin/rule-review-model"

type DB = SupabaseClient<Database>

/** The single source for every admin Rule review badge and health count. */
export async function ruleReviewCounts(db: DB, now = new Date()): Promise<RuleReviewCounts> {
  const today = now.toISOString().slice(0, 10)
  const { data, error } = await db
    .from("requirements")
    .select("req_code, needs_legal_review, verified_on, legal_status")
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)

  if (error) throw error
  return summarizeRuleReview((data ?? []) as RuleReviewVersionState[], now)
}
