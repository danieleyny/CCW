/**
 * Where a concierge-mode case belongs on the portal home, and whether it still owes
 * a service fee. Pure so the invariant that a SPONSORED applicant is never shown a
 * price (P0-2) is unit-tested, not just asserted in the server component.
 *
 * A sponsored concierge case is unlocked by its sponsorship, not a Stripe purchase —
 * so it routes to the concierge tower exactly like a paid case, and never surfaces a
 * payment card or a price.
 */
export interface ConciergeRoutingInput {
  intakeDone: boolean
  serviceMode: "self_guided" | "concierge" | null
  paidConcierge: boolean
  /** A non-revoked case_sponsorships row exists. */
  isSponsored: boolean
  isLicensed: boolean
  isDenied: boolean
}

export interface ConciergeRouting {
  /** Send them to /portal/concierge — their real home. */
  redirectToConcierge: boolean
  /** Show the recoverable "finish your payment" card. Never true for a sponsored case. */
  needsConciergePayment: boolean
}

export function decideConciergeRouting(input: ConciergeRoutingInput): ConciergeRouting {
  const { intakeDone, serviceMode, paidConcierge, isSponsored, isLicensed, isDenied } = input
  const unlocked = paidConcierge || isSponsored
  return {
    redirectToConcierge: serviceMode === "concierge" && unlocked,
    needsConciergePayment:
      intakeDone && serviceMode === "concierge" && !paidConcierge && !isSponsored && !isLicensed && !isDenied,
  }
}
