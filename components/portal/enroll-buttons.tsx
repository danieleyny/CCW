"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { startCheckout, type EnrollResult } from "@/app/portal/enroll/actions"
import { Button } from "@/components/ui/button"

/** V3-P3.1 — buy buttons: Checkout when Stripe is on, invoice request when dark. */
export function EnrollButtons({
  packageKey,
  priceCents,
  depositCents,
  stripeOn,
  featured,
}: {
  packageKey: string
  priceCents: number
  depositCents: number
  stripeOn: boolean
  featured: boolean
}) {
  const [state, action, pending] = useActionState<EnrollResult, FormData>(startCheckout, {})

  if (state.requested) {
    return (
      <p className="mt-4 flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-2.5 text-xs text-ok">
        <CheckCircle2 className="size-3.5 shrink-0" /> Request received — we&apos;ll send your invoice
        within one business day.
      </p>
    )
  }

  const custom = priceCents <= 0
  return (
    <div className="mt-4 space-y-2">
      <form action={action}>
        <input type="hidden" name="packageKey" value={packageKey} />
        <input type="hidden" name="mode" value="full" />
        <Button type="submit" disabled={pending} variant={featured ? "default" : "outline"} className="w-full">
          {custom
            ? "Request a quote"
            : stripeOn
              ? `Pay $${(priceCents / 100).toLocaleString("en-US")} now`
              : "Request invoice"}
        </Button>
      </form>
      {!custom && depositCents > 0 && stripeOn && (
        <form action={action}>
          <input type="hidden" name="packageKey" value={packageKey} />
          <input type="hidden" name="mode" value="deposit" />
          <Button type="submit" disabled={pending} variant="ghost" size="sm" className="w-full text-text-mid">
            or pay a ${(depositCents / 100).toLocaleString("en-US")} deposit — balance on filing
          </Button>
        </form>
      )}
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  )
}
