import { afterEach, describe, expect, it } from "vitest"
import { accessCodesEnabled, matchAccessCode } from "@/lib/access-codes"

const originalDiscountCodes = process.env.DISCOUNT_CODES

afterEach(() => {
  if (originalDiscountCodes === undefined) delete process.env.DISCOUNT_CODES
  else process.env.DISCOUNT_CODES = originalDiscountCodes
})

describe("fixed-price access codes", () => {
  it("matches a concierge-only $500 code without exposing its plaintext", () => {
    process.env.DISCOUNT_CODES = "GLNYC-CONCIERGE500:full_concierge:50000:2"

    const match = matchAccessCode("glnyc-concierge500", "full_concierge")

    expect(accessCodesEnabled()).toBe(true)
    expect(match).toMatchObject({
      kind: "discount",
      label: "CONCIERGE500",
      packageKey: "full_concierge",
      priceCents: 50000,
      maxUses: 2,
    })
    expect(match?.fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(match?.fingerprint).not.toContain("GLNYC")
  })

  it("does not allow a concierge code to be used for another package", () => {
    process.env.DISCOUNT_CODES = "GLNYC-CONCIERGE500:full_concierge:50000:2"

    expect(matchAccessCode("GLNYC-CONCIERGE500", "self_guided")).toBeNull()
  })
})
