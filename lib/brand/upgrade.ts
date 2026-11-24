import { BRANDS } from "@/config/brands"

export const BRAND_UPGRADE_CONSENT = `I agree to transfer my case, documents and messages to Gun License NYC, operated by ${BRANDS.gln.legalName}, for full-service support.`

export function calculateUpgradeQuote(
  paidCents: number,
  targetCents: number,
  mode: "credit_paid" | "none",
) {
  const safePaid = Math.max(0, Math.trunc(paidCents))
  const safeTarget = Math.max(0, Math.trunc(targetCents))
  const creditCents = mode === "credit_paid" ? Math.min(safePaid, safeTarget) : 0
  return { creditCents, dueCents: Math.max(0, safeTarget - creditCents) }
}
