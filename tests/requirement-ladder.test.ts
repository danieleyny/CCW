/**
 * The ladder is pure and derived, so it can be pinned down exactly — no DB, no
 * fixtures. The cases below are the ones that actually happen to people.
 */
import { describe, expect, it } from "vitest"
import { deriveLadder, hasCompletingEvidence, reviewerLabel } from "@/lib/requirements/ladder"

describe("completing evidence — our own draft never counts", () => {
  const base = {
    mode: "generate" as string | undefined,
    wetInk: false,
    signedAt: false,
    hasUpload: false,
    documentId: false,
    rosterBound: false,
  }

  it("generate + signable: an unsigned draft (document bound) is NOT evidence", () => {
    // The draft is bound as document_id at generation — that must not count.
    expect(hasCompletingEvidence({ ...base, documentId: true })).toBe(false)
  })
  it("generate + signable: the SAME document, once signed, IS evidence", () => {
    expect(hasCompletingEvidence({ ...base, documentId: true, signedAt: true })).toBe(true)
  })
  it("generate + wet-ink: an unsigned/un-notarized draft is NOT evidence", () => {
    expect(hasCompletingEvidence({ ...base, wetInk: true, documentId: true, signedAt: true })).toBe(false)
  })
  it("generate + wet-ink: an UPLOADED completed copy IS evidence", () => {
    expect(hasCompletingEvidence({ ...base, wetInk: true, hasUpload: true })).toBe(true)
  })
  it("obtain: any uploaded document is evidence", () => {
    expect(hasCompletingEvidence({ ...base, mode: "obtain", hasUpload: true })).toBe(true)
    expect(hasCompletingEvidence({ ...base, mode: "obtain", documentId: true })).toBe(true)
    expect(hasCompletingEvidence({ ...base, mode: "obtain" })).toBe(false)
  })
  it("roster: bound reference/cohabitant evidence counts; a stray draft does not", () => {
    expect(hasCompletingEvidence({ ...base, mode: "roster", rosterBound: true })).toBe(true)
    expect(hasCompletingEvidence({ ...base, mode: "roster" })).toBe(false)
  })
  it("roster: our own bound DRAFT never counts — sole-occupancy needs its uploaded notarised copy", () => {
    // COH-01 binds document_id to the generated draft the moment the applicant lists
    // their household; that draft must not read as done until the notarised copy is in.
    expect(hasCompletingEvidence({ ...base, mode: "roster", documentId: true })).toBe(false)
    expect(hasCompletingEvidence({ ...base, mode: "roster", hasUpload: true })).toBe(true)
  })
})

describe("the ladder reflects it — an unsigned draft is 'Not started', not 'Received'", () => {
  it("generate + signable, unsigned draft → pending (Need you)", () => {
    const hasEvidence = hasCompletingEvidence({
      mode: "generate", wetInk: false, signedAt: false, hasUpload: false, documentId: true, rosterBound: false,
    })
    expect(deriveLadder({ status: "pending", hasEvidence })).toBe("pending")
  })
  it("generate + signable, signed → submitted then satisfied → approved", () => {
    const hasEvidence = hasCompletingEvidence({
      mode: "generate", wetInk: false, signedAt: true, hasUpload: false, documentId: true, rosterBound: false,
    })
    expect(deriveLadder({ status: "pending", hasEvidence })).toBe("submitted")
    expect(deriveLadder({ status: "satisfied", hasEvidence })).toBe("approved")
  })
  it("generate + wet-ink, draft only → pending; uploaded copy → submitted", () => {
    const draftOnly = hasCompletingEvidence({
      mode: "generate", wetInk: true, signedAt: true, hasUpload: false, documentId: true, rosterBound: false,
    })
    expect(deriveLadder({ status: "pending", hasEvidence: draftOnly })).toBe("pending")
    const uploaded = hasCompletingEvidence({
      mode: "generate", wetInk: true, signedAt: true, hasUpload: true, documentId: true, rosterBound: false,
    })
    expect(deriveLadder({ status: "pending", hasEvidence: uploaded })).toBe("submitted")
  })
})

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

  it("an approved document reads approved even if the requirement lagged", () => {
    // IDN-03: the document is approved (widget shows it) but the requirement row
    // was left unsatisfied by the old cascade — the card must still say approved.
    expect(
      deriveLadder({ status: "pending", hasEvidence: true, docStatus: "approved" })
    ).toBe("approved")
  })

  it("a rejected document reads as needs-a-fix", () => {
    expect(
      deriveLadder({ status: "pending", hasEvidence: true, docStatus: "rejected" })
    ).toBe("changes_requested")
  })

  it("never tells an applicant an instructor reviewed their disclosures", () => {
    expect(reviewerLabel("trainer")).toBe("your instructor")
    expect(reviewerLabel("staff")).toBe("Gun License NYC")
    expect(reviewerLabel(null)).toBe("Gun License NYC")
  })
})
