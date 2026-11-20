import { describe, expect, it } from "vitest"
import {
  buildStageVisits,
  businessDurationDays,
  distribution,
  etDate,
  friendlyLeadSource,
  inRange,
  reportRange,
} from "@/lib/admin/reports-model"

describe("admin reports date boundaries", () => {
  it("uses New York month boundaries, including late-night ET payments", () => {
    const range = reportRange("month", new Date("2026-11-19T17:00:00.000Z"))
    expect(range.start?.toISOString()).toBe("2026-11-01T04:00:00.000Z")
    expect(inRange("2026-11-01T03:30:00.000Z", range.start, range.end)).toBe(false)
    expect(inRange("2026-11-01T04:30:00.000Z", range.start, range.end)).toBe(true)
  })

  it("converts New York wall time through daylight and standard time", () => {
    expect(etDate(2026, 1, 15, 9).toISOString()).toBe("2026-01-15T14:00:00.000Z")
    expect(etDate(2026, 7, 15, 9).toISOString()).toBe("2026-07-15T13:00:00.000Z")
  })

  it("excludes weekends from service-level elapsed time", () => {
    expect(businessDurationDays("2026-11-20T21:00:00.000Z", "2026-11-23T21:00:00.000Z")).toBe(1)
  })
})

describe("admin reports stage history", () => {
  it("closes only stages proved by the activity log and counts re-entry visits", () => {
    const visits = buildStageVisits(
      [{ id: "case-a", createdAt: "2026-11-01T12:00:00.000Z" }],
      [
        { caseId: "case-a", createdAt: "2026-11-02T12:00:00.000Z", to: "eligibility_screened" },
        { caseId: "case-a", createdAt: "2026-11-04T12:00:00.000Z", to: "lead" },
        { caseId: "case-a", createdAt: "2026-11-05T12:00:00.000Z", to: "eligibility_screened" },
      ],
    )
    expect(visits.map((visit) => [visit.stage, visit.days])).toEqual([
      ["lead", 1],
      ["eligibility_screened", 2],
      ["lead", 1],
    ])
    expect(visits.some((visit) => visit.stage === "signed_up_paid")).toBe(false)
  })

  it("uses median and the middle half instead of averages", () => {
    expect(distribution([1, 2, 3, 100])).toEqual({ median: 2.5, q25: 1.75, q75: 27.25, n: 4 })
  })
})

describe("lead-source labels", () => {
  it("keeps known acquisition labels friendly without discarding raw values", () => {
    expect(friendlyLeadSource("admin_manual")).toBe("Added by staff")
    expect(friendlyLeadSource("word-of-mouth")).toBe("Referral")
    expect(friendlyLeadSource(null)).toBe("Unknown")
    expect(friendlyLeadSource("Community event")).toBe("Community event")
  })
})
