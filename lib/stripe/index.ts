import "server-only"

import Stripe from "stripe"

/**
 * Stripe is gated behind a flag + key so the app runs and demos without it.
 * Flip STRIPE_ENABLED=true and add STRIPE_SECRET_KEY to turn payments on — no
 * code changes required. Phase 4 wires real checkout/webhooks on top of this.
 */
export const STRIPE_ENABLED =
  process.env.STRIPE_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY)

let cached: Stripe | null = null

/** Returns a Stripe client, or null when disabled. Always null-check the result. */
export function getStripe(): Stripe | null {
  if (!STRIPE_ENABLED) return null
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return cached
}

/** Service packages: pricing page, checkout line items, and deposit flow. */
export const SERVICE_PACKAGES = [
  {
    key: "self_guided",
    name: "Self-Guided",
    priceLabel: "$499",
    amountCents: 49900,
    depositCents: 19900,
    blurb: "Portal access, full document checklist, and filing guidance.",
  },
  {
    key: "full_concierge",
    name: "Full Concierge",
    priceLabel: "$1,999",
    amountCents: 199900,
    depositCents: 50000,
    blurb:
      "End-to-end: training coordination, document prep, notarization help, assembly + filing, interview prep.",
    featured: true,
  },
  {
    key: "non_resident",
    name: "Non-Resident / Special Carry",
    priceLabel: "Custom",
    amountCents: 0,
    depositCents: 0,
    blurb: "Dedicated track for out-of-area applicants.",
  },
  {
    key: "renewal",
    name: "Renewal",
    priceLabel: "$399",
    amountCents: 39900,
    depositCents: 0,
    blurb: "Discounted recurring service every 3 years.",
  },
] as const

export type ServicePackageKey = (typeof SERVICE_PACKAGES)[number]["key"]

export function getPackage(key: string) {
  return SERVICE_PACKAGES.find((p) => p.key === key) ?? null
}
