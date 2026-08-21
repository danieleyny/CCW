"use client"

import { useState, useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { deleteDemoCases } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

/**
 * ACCESS CODES — one-click cleanup of demo cases after a presentation. Admin-only
 * (the action re-checks requireAdmin), with a confirm step.
 */
export function DeleteDemoCasesButton({ count }: { count: number }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (count === 0) {
    return <span className="text-xs text-text-low">No demo cases.</span>
  }

  return (
    <div className="flex items-center gap-2">
      {confirming ? (
        <>
          <span className="text-xs text-warn">Delete {count} demo case{count === 1 ? "" : "s"}?</span>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteDemoCases()
                setConfirming(false)
                if (r.error) toast.error(r.error)
                else toast.success(`Deleted ${r.deleted} demo case${r.deleted === 1 ? "" : "s"}.`)
              })
            }
          >
            {pending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Trash2 className="mr-1.5 size-3.5" />}
            Yes, delete
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          <Trash2 className="mr-1.5 size-3.5" /> Delete {count} demo case{count === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  )
}
