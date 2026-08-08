"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { reassignCase, adminAssignInstructor } from "@/app/admin/actions"
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

/**
 * Assign/reassign the case's TRAINER (instructor) from the case header — parity
 * with the staff AssignControl above. Calls the same server action the Training
 * tab uses (adminAssignInstructor), so the engagement + firewall plumbing behind
 * it is unchanged. Assign-only: an instructor is bound to a case via an
 * engagement row, and unassigning is handled from the Training tab.
 */
export function AssignTrainerControl({
  caseId,
  current,
  instructors,
}: {
  caseId: string
  current: string | null
  instructors: { id: string; name: string; verified: boolean }[]
}) {
  const [pending, start] = useTransition()

  if (instructors.length === 0) {
    return <span className="text-xs text-text-low">no trainers yet</span>
  }

  return (
    <select
      value={current ?? ""}
      disabled={pending}
      aria-label="Assigned trainer"
      onChange={(e) => {
        const instructorId = e.target.value
        if (!instructorId) return
        start(async () => {
          try {
            await adminAssignInstructor(caseId, instructorId)
            toast.success("Trainer assigned")
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't assign trainer")
          }
        })
      }}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      <option value="">Assign a trainer…</option>
      {instructors.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}
          {!i.verified ? " (pending)" : ""}
        </option>
      ))}
    </select>
  )
}
