"use client"

import { useTransition } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { payPending } from "@/app/portal/payments/actions"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

export function PayButton({
  paymentId,
  label,
  size = "sm",
  variant = "default",
  className,
}: {
  paymentId: string
  label?: string
  size?: "sm" | "lg"
  variant?: "default" | "gold"
  className?: string
}) {
  const { messages } = usePortalI18n()
  const t = messages.payments
  const [pending, start] = useTransition()

  function pay() {
    start(async () => {
      const res = await payPending(paymentId)
      if (res.url) {
        window.location.href = res.url
      } else if (res.disabled) {
        toast.info(t.onlineSoonToast)
      } else if (res.error) {
        toast.error(res.error)
      }
    })
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={pay}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin motion-reduce:animate-none" />
      ) : (
        <CreditCard className="mr-1.5 size-3.5" />
      )}
      {pending ? t.starting : label ?? t.payDefault}
    </Button>
  )
}
