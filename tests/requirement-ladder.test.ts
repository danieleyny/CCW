/**
 * The ladder is pure and derived, so it can be pinned down exactly — no DB, no
 * fixtures. The cases below are the ones that actually happen to people.
 */
import { describe, expect, it } from "vitest"
import { deriveLadder, reviewerLabel } from "@/lib/requirements/ladder"

describe("status ladder", () => {
  it("nothing provided yet", () => {
    expect(deriveLadder({ status: "pending", hasEvidence: false })).toBe("pending")
  })

  it("provided, nobody has looked yet", () => {
    expect(deriveLadder({ status: "pending", hasEvidence: true })).toBe("submitted")
  })

  it("reviewed and accepted", () => {
    expect(deriveLadder({ status: "satisfied", hasEvidence: true })).toBe("approved")
  })

  it("sent back with a note", () => {
    expect(
      deriveLadder({
        status: "pending",
        hasEvidence: true,
        latestReview: { decision: "changes_requested" },
      })
    ).toBe("changes_requested")
  })

  it("resubmitting clears the change request without another review", () => {
    // The trainer's request is answered by the applicant providing something
    // new; the item goes back to "in review" rather than staying red.
    expect(
      deriveLadder({
        status: "pending",
        hasEvidence: true,
        latestReview: { decision: "approved" },
      })
    ).toBe("submitted")
  })

  it("satisfied outranks a stale change request", () => {
    // Staff can satisfy an item directly (override, system check). The applicant
    // must not still see "needs a fix" on something that's done.
    expect(
      deriveLadder({
        status: "satisfied",
        hasEvidence: true,
        latestReview: { decision: "changes_requested" },
      })
    ).toBe("approved")
  })

  it("an item satisfied with no bound evidence still reads as approved", () => {
    // Attestations (FEE-01, the eligibility checks) have nothing to attach.
    expect(deriveLadder({ status: "satisfied", hasEvidence: false })).toBe("approved")
  })

  it("never tells an applicant an instructor reviewed their disclosures", () => {
    expect(reviewerLabel("trainer")).toBe("your instructor")
    expect(reviewerLabel("staff")).toBe("Gun License NYC")
    expect(reviewerLabel(null)).toBe("Gun License NYC")
  })
})
