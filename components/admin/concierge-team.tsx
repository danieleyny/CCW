"use client"

import { useState, useTransition } from "react"
import { ConciergeBell, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { setConciergeAgent } from "@/app/admin/actions"
import { trackEvent } from "@/lib/analytics"
import type { ConciergeTeamMember } from "@/lib/concierge/board"
import { initials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type StaffMember = ConciergeTeamMember

function AgentChip({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        on ? "bg-[#F8EBCB] text-[#76510E]" : "bg-[#EEF1F5] text-[#667085]"
      )}
    >
      {on ? <ConciergeBell className="size-3" aria-hidden /> : null}
      {on ? "Agent" : "Not an agent"}
    </span>
  )
}

/** Admin-confirmed roster controls; mobile intentionally remains read-only. */
export function ConciergeTeam({ staff, canEdit }: { staff: StaffMember[]; canEdit: boolean }) {
  const [members, setMembers] = useState(() => staff)
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    if (!selected) return
    const next = !selected.isAgent
    startTransition(async () => {
      const result = await setConciergeAgent(selected.id, next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setMembers((current) => current.map((member) => member.id === selected.id ? { ...member, isAgent: next } : member))
      trackEvent("admin_concierge_agent_changed", { enabled: next })
      toast.success(`${selected.name} is ${next ? "now" : "no longer"} a concierge agent.`)
      setSelected(null)
    })
  }

  return (
    <>
      <ul className="divide-y divide-black/[.07] overflow-hidden rounded-xl border border-black/[.08] bg-white shadow-sm">
        {members.map((member) => (
          <li key={member.id} className="flex min-h-[72px] items-center justify-between gap-3 p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-[#E7ECF4] text-xs font-semibold text-[#14254A]">
                  {initials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[#101828]">{member.name}</span>
                  <AgentChip on={member.isAgent} />
                </div>
                <p className="mt-1 text-xs capitalize text-[#667085]">
                  {member.role} · {member.clientCount} client{member.clientCount === 1 ? "" : "s"} · {member.ourMoveCount} our move
                </p>
              </div>
            </div>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant={member.isAgent ? "outline" : "gold"}
                className="hidden md:inline-flex"
                onClick={() => setSelected(member)}
              >
                {member.isAgent ? "Remove agent" : "Make agent"}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !pending) setSelected(null) }}>
        <DialogContent className="bg-white text-[#101828] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selected?.isAgent
                ? `Remove ${selected.name} as a concierge agent?`
                : `Make ${selected?.name} a concierge agent?`}
            </DialogTitle>
            <DialogDescription className="text-[#475467]">
              {selected?.isAgent
                ? `Their ${selected.clientCount} client${selected.clientCount === 1 ? " keeps" : "s keep"} ${selected.name} as owner until you reassign them.`
                : `${selected?.name} will appear as an agent you can assign clients to.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[#D9B25F]/40 bg-[#FFF9EA] p-3 text-xs text-[#694B13]">
            This is a label for assignment, not a permission.
          </div>
          <DialogFooter className="bg-[#F8F9FB]">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="button" variant={selected?.isAgent ? "destructive" : "gold"} disabled={pending} onClick={confirm}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {selected?.isAgent ? "Remove agent" : "Make agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
