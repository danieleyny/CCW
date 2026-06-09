"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { payPending } from "@/app/portal/payments/actions"
import { Button } from "@/components/ui/button"

export function PayButton({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition()

  function pay() {
    start(async () => {
      const res = await payPending(paymentId)
      if (res.url) {
        window.location.href = res.url
      } else if (res.disabled) {
        toast.info("Online payments open soon — your concierge will send an invoice.")
      } else if (res.error) {
        toast.error(res.error)
      }
    })
  }

  return (
    <Button size="sm" onClick={pay} disabled={pending}>
      {pending ? "…" : "Pay now"}
    </Button>
  )
}
