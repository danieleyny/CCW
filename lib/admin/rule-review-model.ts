import { LEGAL_REVIEW_STALE_DAYS } from "@/lib/legal-status"

export type RuleReviewStatus = "needs_review" | "stale" | "not_enforced" | "reviewed"

export interface RuleReviewVersionState {
  req_code: string
  needs_legal_review: boolean
  verified_on: string | null
  legal_status: string
}

export interface RuleReviewCounts {
  total: number
  reviewed: number
  needsReview: number
  stale: number
  notEnforced: number
  attention: number
  activeVersions: number
  attentionVersions: number
  needsReviewVersions: number
  staleVersions: number
}

const STATUS_PRIORITY: Record<RuleReviewStatus, number> = {
  needs_review: 0,
  stale: 1,
  not_enforced: 2,
  reviewed: 3,
}

export function ruleReviewCutoff(now = new Date()): string {
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - LEGAL_REVIEW_STALE_DAYS)
  return cutoff.toISOString().slice(0, 10)
}

export function ruleReviewStatus(
  row: Pick<RuleReviewVersionState, "needs_legal_review" | "verified_on" | "legal_status">,
  now = new Date()
): RuleReviewStatus {
  if (row.needs_legal_review) return "needs_review"
  if (!row.verified_on || row.verified_on < ruleReviewCutoff(now)) return "stale"
  if (row.legal_status !== "enforced") return "not_enforced"
  return "reviewed"
}

export function worstRuleReviewStatus(statuses: RuleReviewStatus[]): RuleReviewStatus {
  return [...statuses].sort((a, b) => STATUS_PRIORITY[a] - STATUS_PRIORITY[b])[0] ?? "reviewed"
}

/**
 * Counts the same grouped rule rows the Rule review page shows. Jurisdiction
 * versions remain independently reviewable, but one req_code is one row and one
 * badge item so the shell, Today, Requirements and the page cannot disagree.
 */
export function summarizeRuleReview(
  rows: RuleReviewVersionState[],
  now = new Date()
): RuleReviewCounts {
  const groups = new Map<string, RuleReviewStatus[]>()
  let attentionVersions = 0
  let needsReviewVersions = 0
  let staleVersions = 0

  for (const row of rows) {
    const status = ruleReviewStatus(row, now)
    const statuses = groups.get(row.req_code) ?? []
    statuses.push(status)
    groups.set(row.req_code, statuses)
    if (status === "needs_review" || status === "stale") attentionVersions += 1
    if (status === "needs_review") needsReviewVersions += 1
    if (status === "stale") staleVersions += 1
  }

  const groupedStatuses = [...groups.values()].map(worstRuleReviewStatus)
  const needsReview = groupedStatuses.filter((status) => status === "needs_review").length
  const stale = groupedStatuses.filter((status) => status === "stale").length
  const notEnforced = groupedStatuses.filter((status) => status === "not_enforced").length
  const reviewed = groupedStatuses.filter((status) => status === "reviewed").length

  return {
    total: groupedStatuses.length,
    reviewed,
    needsReview,
    stale,
    notEnforced,
    attention: needsReview + stale,
    activeVersions: rows.length,
    attentionVersions,
    needsReviewVersions,
    staleVersions,
  }
}

export const ruleReviewStatusPriority = STATUS_PRIORITY
