import { describe, expect, it } from "vitest"
import {
  ruleReviewStatus,
  summarizeRuleReview,
  worstRuleReviewStatus,
} from "@/lib/admin/rule-review-model"

const now = new Date("2026-11-18T17:00:00.000Z")

describe("Rule review status", () => {
  it("uses the required precedence", () => {
    expect(ruleReviewStatus({ needs_legal_review: true, verified_on: null, legal_status: "repealed" }, now)).toBe("needs_review")
    expect(ruleReviewStatus({ needs_legal_review: false, verified_on: "2026-01-01", legal_status: "repealed" }, now)).toBe("stale")
    expect(ruleReviewStatus({ needs_legal_review: false, verified_on: "2026-11-01", legal_status: "repealed" }, now)).toBe("not_enforced")
    expect(ruleReviewStatus({ needs_legal_review: false, verified_on: "2026-11-01", legal_status: "enforced" }, now)).toBe("reviewed")
  })

  it("shows the worse jurisdiction status for a grouped rule", () => {
    expect(worstRuleReviewStatus(["reviewed", "stale"])).toBe("stale")
    expect(worstRuleReviewStatus(["not_enforced", "needs_review"])).toBe("needs_review")
  })

  it("counts grouped in-force rule rows while retaining version totals", () => {
    const counts = summarizeRuleReview([
      { req_code: "IDN-01", needs_legal_review: true, verified_on: null, legal_status: "enforced" },
      { req_code: "IDN-01", needs_legal_review: false, verified_on: "2026-11-01", legal_status: "enforced" },
      { req_code: "TRN-01", needs_legal_review: false, verified_on: "2026-01-01", legal_status: "enforced" },
      { req_code: "RES-01", needs_legal_review: false, verified_on: "2026-11-01", legal_status: "repealed" },
      { req_code: "REF-01", needs_legal_review: false, verified_on: "2026-11-01", legal_status: "enforced" },
    ], now)

    expect(counts).toEqual({
      total: 4,
      reviewed: 1,
      needsReview: 1,
      stale: 1,
      notEnforced: 1,
      attention: 2,
      activeVersions: 5,
      attentionVersions: 2,
      needsReviewVersions: 1,
      staleVersions: 1,
    })
  })
})
