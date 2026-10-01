/**
 * P0-2 — a SPONSORED concierge applicant is unlocked by their sponsorship, not a
 * Stripe purchase. They must route to the concierge tower like a paid case and must
 * NEVER be shown a $1,000 payment card or any price.
 */
import { describe, expect, it } from "vitest"
import { decideConciergeRouting, type ConciergeRoutingInput } from "@/lib/portal/concierge-routing"

const base: ConciergeRoutingInput = {
  intakeDone: true,
  serviceMode: "concierge",
  paidConcierge: false,
  isSponsored: false,
  isLicensed: false,
  isDenied: false,
}

describe("decideConciergeRouting", () => {
  it("a sponsored concierge case routes to the tower and NEVER owes a payment", () => {
    const r = decideConciergeRouting({ ...base, isSponsored: true })
    expect(r.redirectToConcierge).toBe(true)
    expect(r.needsConciergePayment).toBe(false)
  })

  it("a paid concierge case routes to the tower and owes nothing", () => {
    const r = decideConciergeRouting({ ...base, paidConcierge: true })
    expect(r.redirectToConcierge).toBe(true)
    expect(r.needsConciergePayment).toBe(false)
  })

  it("an unpaid, unsponsored concierge case (payment limbo) stays home and owes payment", () => {
    const r = decideConciergeRouting(base)
    expect(r.redirectToConcierge).toBe(false)
    expect(r.needsConciergePayment).toBe(true)
  })

  it("a self-guided case never routes to the tower and never owes a concierge fee", () => {
    const r = decideConciergeRouting({ ...base, serviceMode: "self_guided" })
    expect(r.redirectToConcierge).toBe(false)
    expect(r.needsConciergePayment).toBe(false)
  })

  it("a licensed or denied sponsored case is still routed and still free", () => {
    for (const flag of ["isLicensed", "isDenied"] as const) {
      const r = decideConciergeRouting({ ...base, isSponsored: true, [flag]: true })
      expect(r.redirectToConcierge).toBe(true)
      expect(r.needsConciergePayment).toBe(false)
    }
  })
})
