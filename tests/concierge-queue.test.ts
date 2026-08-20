/**
 * CONCIERGE Phase 10 — the work-queue's signal logic. Each concierge case shows
 * the single next thing it needs, and blocked-on-us/applicant items sort above
 * NYPD-clock cases. Pure test of deriveSignal.
 */
import { describe, expect, it } from "vitest"
import { deriveSignal } from "@/lib/concierge/queue"

const base = {
  stage: "document_collection" as const,
  paid: true,
  agreementsComplete: true,
  introBooked: true,
  introRequested: false,
  pending: 0,
}

describe("deriveSignal — concierge queue prioritization", () => {
  it("unpaid is ATTENTION, split by whose court the ball is in", () => {
    const invite = deriveSignal({ ...base, paid: false, staffCreated: true, hasAccount: false })
    expect(invite.label).toBe("Invite them")
    expect(invite.tone).toBe("attention")

    const chase = deriveSignal({ ...base, paid: false, staffCreated: true, hasAccount: true })
    expect(chase.label).toBe("Awaiting payment — chase")
    expect(chase.tone).toBe("attention")

    const selfServe = deriveSignal({ ...base, paid: false, staffCreated: false })
    expect(selfServe.label).toBe("Chose concierge, hasn't paid")
    expect(selfServe.tone).toBe("attention")

    // "Invite them" (no account yet) is the most urgent unpaid state.
    expect(invite.priority).toBeLessThan(chase.priority)
    expect(chase.priority).toBeLessThan(selfServe.priority)
  })

  it("unsigned agreements is the top attention item", () => {
    const s = deriveSignal({ ...base, agreementsComplete: false })
    expect(s.label).toContain("agreements")
    expect(s.tone).toBe("attention")
    expect(s.priority).toBeLessThan(30)
  })

  it("a requested intro call needs scheduling before an unbooked one", () => {
    const requested = deriveSignal({ ...base, introBooked: false, introRequested: true })
    const unbooked = deriveSignal({ ...base, introBooked: false })
    expect(requested.priority).toBeLessThan(unbooked.priority)
  })

  it("outstanding documents show a count", () => {
    expect(deriveSignal({ ...base, pending: 3 }).label).toBe("3 documents outstanding")
    expect(deriveSignal({ ...base, pending: 1 }).label).toBe("1 document outstanding")
  })

  it("all docs in, pre-filing → review for QA", () => {
    expect(deriveSignal({ ...base, pending: 0 }).label).toBe("All documents in — review for QA")
  })

  it("assembled → ready for their review & filing", () => {
    const s = deriveSignal({ ...base, stage: "application_assembled", pending: 0 })
    expect(s.label).toBe("Ready for their review & filing")
    expect(s.tone).toBe("attention")
  })

  it("NYPD-controlled stage waits, low priority", () => {
    const s = deriveSignal({ ...base, stage: "under_investigation" })
    expect(s.label).toContain("NYPD")
    expect(s.tone).toBe("waiting")
    expect(s.priority).toBeGreaterThan(deriveSignal({ ...base, pending: 2 }).priority)
  })
})
