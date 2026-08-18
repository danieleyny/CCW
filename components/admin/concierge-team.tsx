"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ConciergeBell, Loader2 } from "lucide-react"
import { setConciergeAgent } from "@/app/admin/actions"
import { initials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface StaffMember {
  id: string
  name: string
  role: string
  isAgent: boolean
}

/**
 * CONCIERGE Phase 8 — the concierge team roster. Admins toggle who runs
 * done-for-you cases; staff see the roster read-only. It's a label, not a
 * permission gate — every staff member already has full case access.
 */
export function ConciergeTeam({ staff, canEdit }: { staff: StaffMember[]; canEdit: boolean }) {
  const [agents, setAgents] = useState<Record<string, boolean>>(
    Object.fromEntries(staff.map((s) => [s.id, s.isAgent]))
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function toggle(id: string) {
    const next = !agents[id]
    setBusyId(id)
    start(async () => {
      const r = await setConciergeAgent(id, next)
      setBusyId(null)
      if (r.error) toast.error(r.error)
      else {
        setAgents((m) => ({ ...m, [id]: next }))
        toast.success(next ? "Added to the concierge team." : "Removed from the concierge team.")
      }
    })
  }

  return (
    <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
      {staff.map((s) => {
        const on = agents[s.id]
        return (
          <li key={s.id} className="flex items-center justify-between gap-3 p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback>{initials(s.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs capitalize text-text-low">{s.role}</div>
              </div>
            </div>

            {canEdit ? (
              <button
                type="button"
                onClick={() => toggle(s.id)}
                disabled={pending && busyId === s.id}
                aria-pressed={on}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  on
                    ? "border-brass/50 bg-brass/15 text-brass-bright"
                    : "border-hairline bg-surface-2 text-text-mid hover:text-foreground"
                )}
              >
                {pending && busyId === s.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ConciergeBell className="size-3.5" />
                )}
                {on ? "Concierge agent" : "Make agent"}
              </button>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
                  on ? "bg-brass/15 text-brass-bright" : "text-text-low"
                )}
              >
                {on && <ConciergeBell className="size-3.5" />}
                {on ? "Concierge agent" : "—"}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
