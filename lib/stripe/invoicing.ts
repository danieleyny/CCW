import "server-only"

import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface ClientForCustomer {
  id: string
  email: string | null
  full_name: string | null
  stripe_customer_id: string | null
}

/**
 * Find-or-create the Stripe Customer for a client, persisting the id so every
 * later invoice and Checkout receipt reuses it.
 *
 * Self-healing across accounts/modes: a stored id from a different account or
 * from test mode is invalid under live keys (Stripe returns "No such
 * customer"). Rather than fail, we detect that and mint a fresh Customer,
 * overwriting the stale id. So flipping test → live never strands a client.
 */
export async function findOrCreateCustomer(
  db: DB,
  stripe: Stripe,
  client: ClientForCustomer
): Promise<string> {
  if (client.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(client.stripe_customer_id)
      // A retrieved-but-deleted customer comes back as { deleted: true }.
      if (existing && !("deleted" in existing && existing.deleted)) {
        return client.stripe_customer_id
      }
    } catch (err) {
      // "No such customer" (wrong account/mode) → fall through and recreate.
      // Anything else is a real error we shouldn't swallow.
      if (!(err instanceof Error && /no such customer/i.test(err.message))) throw err
    }
  }

  const customer = await stripe.customers.create({
    email: client.email ?? undefined,
    name: client.full_name ?? undefined,
    metadata: { client_id: client.id },
  })
  await db.from("clients").update({ stripe_customer_id: customer.id }).eq("id", client.id)
  return customer.id
}

export interface CreateInvoiceInput {
  customerId: string
  paymentId: string
  caseId: string
  amountCents: number
  description: string
  /** Days the client has to pay before the invoice is past due. */
  daysUntilDue?: number
}

export interface CreatedInvoice {
  id: string
  hostedInvoiceUrl: string | null
}

/**
 * Create → finalize → send a hosted Stripe invoice for our own service fee.
 * `send_invoice` means Stripe emails the client a branded pay page (Checkout is
 * the other path). The `payment_id`/`case_id` metadata is what the webhook
 * reconciles `invoice.*` events against.
 */
export async function createAndSendInvoice(
  stripe: Stripe,
  input: CreateInvoiceInput
): Promise<CreatedInvoice> {
  const { customerId, paymentId, caseId, amountCents, description, daysUntilDue = 7 } = input

  // The item must exist before the invoice so it's swept in on create.
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: amountCents,
    currency: "usd",
    description,
  })

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: daysUntilDue,
    description,
    metadata: { payment_id: paymentId, case_id: caseId },
    pending_invoice_items_behavior: "include",
  })

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id!)
  await stripe.invoices.sendInvoice(finalized.id!)

  return { id: finalized.id!, hostedInvoiceUrl: finalized.hosted_invoice_url ?? null }
}
