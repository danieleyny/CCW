"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { reassignCase } from "@/app/admin/actions"
import type { StaffOption } from "@/components/admin/case-tasks"

/** V3-P2.2 — assign/reassign the case's consultant (previously read-only). */
export function AssignControl({
  caseId,
  clientId,
  current,
  staff,
}: {
  caseId: string
  clientId: string
  current: string | null
  staff: StaffOption[]
}) {
  const [pending, start] = useTransition()

  return (
    <select
      value={current ?? ""}
      disabled={pending}
      aria-label="Assigned consultant"
      onChange={(e) =>
        start(async () => {
          const fd = new FormData()
          fd.set("caseId", caseId)
          fd.set("clientId", clientId)
          fd.set("staffId", e.target.value)
          try {
            await reassignCase(fd)
            toast.success("Case reassigned")
          } catch {
            toast.error("Couldn't reassign")
          }
        })
      }
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      <option value="">Unassigned</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}
