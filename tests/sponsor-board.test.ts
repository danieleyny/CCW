/**
 * The employer board's per-worker derivation (S1 Phase 2). Owner is worker / employer /
 * us / NYPD; an NYPD-controlled stage is labelled as waiting on NYPD and never implies we
 * can speed it up; the county-licence expiry drives a 90-day flag.
 */
import { describe, expect, it } from "vitest"
import { deriveBoardRow } from "@/lib/sponsor/board"
import type { SponsorCaseRow, SponsorRequirementRow } from "@/lib/sponsor/queries"

const NOW = Date.parse("2026-09-27T00:00:00Z")
const BANNED = /guarantee|expedite|fast[- ]track|\binsider\b|approval rate/i

function caseRow(over: Partial<SponsorCaseRow>): SponsorCaseRow {
  return {
    case_id: "c1",
    sponsorship_id: "s1",
    sponsor_id: "sp1",
    scope: "packet_only",
    stage: "document_collection",
    license_track: "special_carry_guard",
    applicant_name: "Chery Worker",
    county_license_expires_on: null,
    updated_at: "2026-09-20T00:00:00Z",
    ...over,
  }
}
function spnReq(over: Partial<SponsorRequirementRow>): SponsorRequirementRow {
  return {
    case_requirement_id: "cr1",
    case_id: "c1",
    req_code: "SPN-01",
    status: "pending",
    document_id: null,
    party: "sponsor",
    title: "Company pistol-licence form",
    description: null,
    authority: null,
    severity: "1",
    blocking: true,
    document_type: "carry_guard_company_form",
    scope: "full",
    ...over,
  }
}

describe("deriveBoardRow", () => {
  it("a worker under NYPD investigation reads as waiting on NYPD, not on us", () => {
    const r = deriveBoardRow(caseRow({ stage: "under_investigation" }), [], NOW)
    expect(r.owner).toBe("nypd")
    expect(r.ownerLabel).toBe("NYPD")
    expect(r.blockingItem.toLowerCase()).toContain("nypd")
    expect(r.blockingItem).not.toMatch(BANNED)
  })

  it("an unsatisfied company packet item is owned by the employer", () => {
    const r = deriveBoardRow(caseRow({ stage: "document_collection" }), [spnReq({ title: "Watch/Guard agency licence" })], NOW)
    expect(r.owner).toBe("employer")
    expect(r.blockingItem).toBe("Watch/Guard agency licence")
  })

  it("with the packet done and no NYPD stage, the worker owns it (never leaks their file)", () => {
    const r = deriveBoardRow(caseRow({ stage: "document_collection" }), [spnReq({ status: "satisfied" })], NOW)
    expect(r.owner).toBe("worker")
    expect(r.blockingItem).not.toMatch(BANNED)
  })

  it("licensed is done", () => {
    expect(deriveBoardRow(caseRow({ stage: "licensed" }), [], NOW).owner).toBe("done")
  })

  it("flags a county licence expiring within 90 days, and one already expired", () => {
    const soon = deriveBoardRow(caseRow({ county_license_expires_on: "2026-11-01" }), [], NOW) // ~35 days
    expect(soon.countyExpiringSoon).toBe(true)
    expect(soon.countyExpired).toBe(false)

    const gone = deriveBoardRow(caseRow({ county_license_expires_on: "2026-09-01" }), [], NOW)
    expect(gone.countyExpired).toBe(true)

    const far = deriveBoardRow(caseRow({ county_license_expires_on: "2027-06-01" }), [], NOW)
    expect(far.countyExpiringSoon).toBe(false)
    expect(far.countyExpired).toBe(false)
  })

  it("no owner's blocking copy uses a banned marketing word", () => {
    for (const stage of ["lead", "document_collection", "notarization", "application_assembled", "filed", "under_investigation", "decision", "licensed"] as const) {
      const r = deriveBoardRow(caseRow({ stage }), [], NOW)
      expect(r.blockingItem, `${stage}: ${r.blockingItem}`).not.toMatch(BANNED)
    }
  })
})
