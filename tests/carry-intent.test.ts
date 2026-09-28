/**
 * Civilian Special Carry routing + the county-licence expiry flag (SPECIAL_CARRY_CHANNEL
 * Phases 1–2). Pure — the DB-backed SPC-01 gate and referral privacy live in
 * tests/rls/referral-channel.test.ts.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { resolveCarryRoute } from "@/lib/requirements/carry-intent"
import { countyExpiryStatus } from "@/lib/county-license"

describe("resolveCarryRoute — intent decides the category, never the referral", () => {
  it("personal carry → Special Carry, with the armed-assignment guardrail", () => {
    expect(resolveCarryRoute("personal")).toEqual({
      intent: "personal",
      product: "special_carry",
      personalCarryWarning: true,
      needsGuardSetup: false,
    })
  })
  it("armed-assignment → Special Carry Guard; unsponsored needs guard setup", () => {
    expect(resolveCarryRoute("armed_assignment")).toEqual({
      intent: "armed_assignment",
      product: "special_carry_guard",
      personalCarryWarning: false,
      needsGuardSetup: true,
    })
    expect(resolveCarryRoute("armed_assignment", { isSponsored: true })!.needsGuardSetup).toBe(false)
  })
  it("no intent → no route", () => {
    expect(resolveCarryRoute(undefined)).toBeNull()
    expect(resolveCarryRoute(null)).toBeNull()
    // @ts-expect-error — a garbage value resolves to nothing, never a default route.
    expect(resolveCarryRoute("something_else")).toBeNull()
  })
  it("the referral source cannot influence routing — it is not even a parameter", () => {
    // Structural guarantee: the same intent always yields the same route. Whoever
    // introduced the applicant is attribution, never a licence category.
    const a = resolveCarryRoute("personal")
    const b = resolveCarryRoute("personal")
    expect(a).toEqual(b)
    expect(a!.product).toBe("special_carry")
  })
})

describe("countyExpiryStatus — the highest-consequence date, flagged at 90 days", () => {
  const NOW = Date.parse("2026-09-27T00:00:00Z")
  it("flags a licence expiring within 90 days", () => {
    const s = countyExpiryStatus("2026-11-01", NOW) // ~35 days
    expect(s.expiringSoon).toBe(true)
    expect(s.expired).toBe(false)
  })
  it("flags one already expired", () => {
    const s = countyExpiryStatus("2026-09-01", NOW)
    expect(s.expired).toBe(true)
    expect(s.expiringSoon).toBe(false)
  })
  it("a licence far in the future is neither", () => {
    const s = countyExpiryStatus("2027-06-01", NOW)
    expect(s.expired).toBe(false)
    expect(s.expiringSoon).toBe(false)
  })
  it("no date → no flag", () => {
    expect(countyExpiryStatus(null, NOW)).toEqual({ expiry: null, expired: false, expiringSoon: false })
  })
})

describe("copy guardrails (Phase 4 #6)", () => {
  const BANNED = /guarantee|expedite|fast[- ]track|\binsider\b|approval rate/i

  it("the intake wizard shows the armed-assignment guardrail on the personal-carry path", () => {
    const src = readFileSync("components/portal/intake/intake-wizard.tsx", "utf8")
    expect(src).toMatch(/does not authorise carrying while working an armed security assignment/i)
    expect(src).toMatch(/Special Carry Guard/i)
  })

  it("no banned words in the new Special Carry / referral copy (AGENTS.md #4)", () => {
    for (const path of [
      "app/sponsor/referrals/page.tsx",
      "components/portal/referral-consent-card.tsx",
      "lib/requirements/carry-intent.ts",
      "lib/requirements/actions.ts",
    ]) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(BANNED)
    }
  })
})
