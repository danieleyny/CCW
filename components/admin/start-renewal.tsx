"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { openRenewalNow } from "@/app/admin/actions"

/** PART C / Phase 10 — staff opens a renewal on demand (redirects to it). */
export function AdminStartRenewal({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData()
          fd.set("caseId", caseId)
          const res = await openRenewalNow(fd)
          // Success redirects server-side; only an error returns here.
          if (res?.error) toast.error(res.error)
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:text-foreground disabled:opacity-60"
    >
      <RefreshCw className="size-3.5" /> Start renewal
    </button>
  )
}
