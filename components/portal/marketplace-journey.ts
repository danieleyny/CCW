export type MarketplaceStep = 1 | 2 | 4

export function deriveMarketplaceStep(input: {
  hasActiveEngagement: boolean
  hasBooking: boolean
  hasOpenOffer: boolean
}): MarketplaceStep {
  if (input.hasActiveEngagement || input.hasBooking) return 4
  if (input.hasOpenOffer) return 2
  return 1
}
