"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw, Check } from "lucide-react"
import { startMyRenewal } from "@/app/portal/license/actions"
import { Button } from "@/components/ui/button"

/**
 * PART C / Phase 10 — one-click "start my renewal". Idempotent server-side, so a
 * double-click or an overlap with the cron just lands on the same renewal case.
 */
export function StartRenewalButton({ alreadyOpen }: { alreadyOpen: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  if (alreadyOpen) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ok">
        <Check className="size-3.5" /> Your renewal is open — it&apos;s in your checklist.
      </p>
    )
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startMyRenewal()
          if (res.error) toast.error(res.error)
          else {
            toast.success("Renewal started — your renewal checklist is ready.")
            router.refresh()
          }
        })
      }
    >
      <RefreshCw className="size-3.5" /> Start my renewal
    </Button>
  )
}
