import { describe, expect, it } from "vitest"
import { PUBLIC_PACKAGE_FALLBACK } from "@/lib/packages"

describe("public package pricing", () => {
  it("offers both public packages as full-payment only", () => {
    expect(PUBLIC_PACKAGE_FALLBACK).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "self_guided", priceCents: 49_900, depositCents: 0 }),
        expect.objectContaining({ key: "full_concierge", priceCents: 100_000, depositCents: 0 }),
      ])
    )
  })
})
