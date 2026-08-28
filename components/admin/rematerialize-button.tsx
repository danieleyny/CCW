"use client"

import { useTransition } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { rematerializeCaseRequirements } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

/**
 * Re-run the requirement generator for this case against the current registry, so a
 * case that predates newly-added requirements picks them up. Additive — satisfied
 * items are never disturbed.
 */
export function RematerializeButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-h-[36px]"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await rematerializeCaseRequirements(caseId)
          if (r.error) {
            toast.error(r.error)
            return
          }
          toast.success(
            r.inserted || r.updated
              ? `Re-materialized — ${r.inserted ?? 0} added, ${r.updated ?? 0} updated.`
              : "Already up to date — no changes."
          )
        })
      }
      title="Re-run the requirement generator against the current registry (additive)"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
      Re-materialize requirements
    </Button>
  )
}
