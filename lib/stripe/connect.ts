import "server-only"

import { getStripe } from "@/lib/stripe"

/**
 * Stripe Connect (Express) for instructor payouts — ships dark behind the
 * existing STRIPE_ENABLED flag (getStripe() returns null when disabled, so every
 * function below cleanly no-ops). The platform takes an application fee on each
 * booking; instructors onboard their own payout account.
 */

const APPLICATION_FEE_BPS = 1000 // 10%

export function platformFeeCents(amountCents: number): number {
  return Math.round((amountCents * APPLICATION_FEE_BPS) / 10000)
}

export async function createConnectAccount(
  email: string | null
): Promise<{ accountId: string } | { skipped: true }> {
  const stripe = getStripe()
  if (!stripe) return { skipped: true }
  const acct = await stripe.accounts.create({
    type: "express",
    email: email ?? undefined,
    capabilities: { transfers: { requested: true } },
  })
  return { accountId: acct.id }
}

export async function createAccountLink(accountId: string, baseUrl: string): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe) return null
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/instructor/payouts`,
    return_url: `${baseUrl}/instructor/payouts`,
    type: "account_onboarding",
  })
  return link.url
}

export async function createBookingDepositCheckout(input: {
  amountCents: number
  connectAccount: string
  bookingId: string
  clientEmail?: string | null
  baseUrl: string
  description: string
}): Promise<{ url: string | null } | { skipped: true }> {
  const stripe = getStripe()
  if (!stripe) return { skipped: true }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: input.description },
          unit_amount: input.amountCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents(input.amountCents),
      transfer_data: { destination: input.connectAccount },
    },
    customer_email: input.clientEmail ?? undefined,
    success_url: `${input.baseUrl}/portal/marketplace?paid=1`,
    cancel_url: `${input.baseUrl}/portal/marketplace`,
    metadata: { booking_id: input.bookingId },
  })
  return { url: session.url }
}
