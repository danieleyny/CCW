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

/**
 * Pin the API version explicitly (best practice): the account's default version
 * can drift, silently changing webhook payload shapes. This matches the `stripe`
 * SDK's own bundled version (22.2.0 → 2026-05-27.dahlia), so the runtime and the
 * TypeScript types agree. Bump this deliberately alongside an SDK upgrade.
 */
const STRIPE_API_VERSION = "2026-05-27.dahlia"

/** Returns a Stripe client, or null when disabled. Always null-check the result. */
export function getStripe(): Stripe | null {
  if (!STRIPE_ENABLED) return null
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION })
  }
  return cached
}

// V3-P3.1 — SERVICE_PACKAGES moved to the DB (service_packages table, read via
// lib/packages.ts): a pricing change is an admin data edit, not a deploy.
