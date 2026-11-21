import { describe, expect, it } from "vitest"
import { deriveMarketplaceStep } from "@/components/portal/marketplace-journey"

describe("marketplace journey", () => {
  it("starts with the request step", () => {
    expect(deriveMarketplaceStep({ hasActiveEngagement: false, hasBooking: false, hasOpenOffer: false })).toBe(1)
  })

  it("moves an open offer to compare", () => {
    expect(deriveMarketplaceStep({ hasActiveEngagement: false, hasBooking: false, hasOpenOffer: true })).toBe(2)
  })

  it("moves an active engagement directly to book", () => {
    expect(deriveMarketplaceStep({ hasActiveEngagement: true, hasBooking: false, hasOpenOffer: false })).toBe(4)
  })

  it("keeps a booked engagement at the completed book step", () => {
    expect(deriveMarketplaceStep({ hasActiveEngagement: true, hasBooking: true, hasOpenOffer: false })).toBe(4)
  })
})
