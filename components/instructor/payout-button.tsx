"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { startPayoutOnboarding } from "@/app/instructor/payouts/actions"
import { Button } from "@/components/ui/button"

export function PayoutButton({ label }: { label: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // On success the action server-redirects to Stripe; on failure it returns.
          const res = await startPayoutOnboarding()
          if (res?.error) toast.error(res.error)
        })
      }
    >
      {pending ? "Starting…" : label}
    </Button>
  )
}
