/**
 * CONCIERGE QA Phase 7 — one definition of "agreements signed". The gate, the
 * work queue, and the reminders engine all call agreementsCurrentFor, which is
 * version-aware: a signature at a STALE version does not count, so a version bump
 * (attorney review) re-opens the gate everywhere at once.
 */
import { describe, expect, it } from "vitest"
import { agreementsCurrentFor } from "@/lib/concierge/onboarding"
import { REQUIRED_AGREEMENT_KINDS, currentAgreementVersion } from "@/config/agreements"

const currentRows = () =>
  REQUIRED_AGREEMENT_KINDS.map((kind) => ({ kind, version: currentAgreementVersion(kind) }))

describe("agreementsCurrentFor", () => {
  it("complete when every required kind is signed at its current version", () => {
    const r = agreementsCurrentFor(currentRows())
    expect(r.complete).toBe(true)
    expect(r.missing).toEqual([])
  })

  it("incomplete when a kind is missing entirely", () => {
    const rows = currentRows().slice(1) // drop the first kind
    const r = agreementsCurrentFor(rows)
    expect(r.complete).toBe(false)
    expect(r.missing).toContain(REQUIRED_AGREEMENT_KINDS[0])
  })

  it("a version bump re-opens the gate: a stale-version signature no longer counts", () => {
    // Simulate esign_consent bumped to a new version — the applicant's old-version
    // row must stop counting (the exact scenario attorney review will produce).
    const kind = "esign_consent"
    const rows = currentRows().map((r) =>
      r.kind === kind ? { kind, version: currentAgreementVersion(kind) - 1 } : r
    )
    const r = agreementsCurrentFor(rows)
    expect(r.complete).toBe(false)
    expect(r.missing).toEqual([kind])
  })
})
