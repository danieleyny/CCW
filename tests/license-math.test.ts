import { describe, expect, it } from "vitest"
import { authExpiresOn, inspectionDueAt, nextEligiblePurchaseOn } from "@/lib/license"
import { tokenActive, tokenExpiry } from "@/lib/references/process"

describe("post-issuance clocks (38 RCNY §§5-24/5-25)", () => {
  it("a purchase authorization is valid exactly 30 days", () => {
    expect(authExpiresOn("2026-07-01")).toBe("2026-07-31")
    expect(authExpiresOn("2026-12-15")).toBe("2027-01-14")
  })
  it("inspection is due 72 hours after acquisition", () => {
    expect(inspectionDueAt("2026-07-01").startsWith("2026-07-04")).toBe(true)
  })
  it("one handgun per 90 days", () => {
    expect(nextEligiblePurchaseOn("2026-07-01")).toBe("2026-09-29")
  })
})

describe("public-token lifecycle", () => {
  it("future tokens are active; expired and revoked are not", () => {
    expect(tokenActive({ expires_at: new Date(Date.now() + 86400000).toISOString(), revoked_at: null })).toBe(true)
    expect(tokenActive({ expires_at: new Date(Date.now() - 1000).toISOString(), revoked_at: null })).toBe(false)
    expect(tokenActive({ expires_at: null, revoked_at: new Date().toISOString() })).toBe(false)
    expect(tokenActive({ expires_at: null, revoked_at: null })).toBe(true) // legacy backfilled
  })
  it("tokenExpiry lands ~30 days out", () => {
    const days = (new Date(tokenExpiry()).getTime() - Date.now()) / 86400000
    expect(days).toBeGreaterThan(29.9)
    expect(days).toBeLessThan(30.1)
  })
})
