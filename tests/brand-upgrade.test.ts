import { describe, expect, it } from "vitest"
import { calculateUpgradeQuote } from "@/lib/brand/upgrade"

describe("brand upgrade quote", () => {
  it("credits the amount actually paid and never more than the target", () => {
    expect(calculateUpgradeQuote(49_900, 100_000, "credit_paid")).toEqual({
      creditCents: 49_900,
      dueCents: 50_100,
    })
    expect(calculateUpgradeQuote(120_000, 100_000, "credit_paid")).toEqual({
      creditCents: 100_000,
      dueCents: 0,
    })
  })

  it("supports an explicit no-credit policy", () => {
    expect(calculateUpgradeQuote(49_900, 100_000, "none")).toEqual({
      creditCents: 0,
      dueCents: 100_000,
    })
  })

  it("clamps malformed negative and fractional values", () => {
    expect(calculateUpgradeQuote(-1, 100_000.9, "credit_paid")).toEqual({
      creditCents: 0,
      dueCents: 100_000,
    })
  })
})
