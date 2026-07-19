"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"
import { signPreFilingQa } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

/**
 * Inline QA sign-off straight from the queue — the same signPreFilingQa the
 * case-page gate card calls. The gate re-checks server-side, so a stale queue
 * row can never sign off a case that quietly regressed.
 */
export function QueueSignOff({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await signPreFilingQa(caseId)
          if (!res.ok) toast.error("Gate re-check failed", { description: res.blockers.join(" · ") })
          else {
            toast.success("QA signed off")
            router.refresh()
          }
        })
      }
    >
      <ShieldCheck className="size-3.5" /> Sign off
    </Button>
  )
}
