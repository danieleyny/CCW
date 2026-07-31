"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { adminAssignInstructor, sendStaffInstructorMessage } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/format"

/** B3A — direct assign/reassign of a verified instructor (full assignment power). */
export function AssignInstructorForm({
  caseId,
  instructors,
  currentName,
}: {
  caseId: string
  instructors: { id: string; name: string }[]
  currentName: string | null
}) {
  const [pending, start] = useTransition()
  const [sel, setSel] = useState("")

  function submit() {
    if (!sel) {
      toast.error("Pick an instructor")
      return
    }
    start(async () => {
      try {
        await adminAssignInstructor(caseId, sel)
        toast.success(currentName ? "Instructor reassigned" : "Instructor assigned")
        setSel("")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't assign")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={sel} onValueChange={setSel}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder={currentName ? `Reassign (now ${currentName})` : "Assign an instructor…"} />
        </SelectTrigger>
        <SelectContent>
          {instructors.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Saving…" : currentName ? "Reassign" : "Assign"}
      </Button>
    </div>
  )
}

interface StaffMsg {
  id: string
  body: string
  createdAt: string
  senderName: string | null
  senderRole: string | null
}

/**
 * B3B — the private staff↔instructor thread (client never sees it). `send` is
 * injected so the same UI serves the admin case file (sendStaffInstructorMessage)
 * and the instructor case view (sendStaffMessage) with the right authz.
 */
export function StaffInstructorThread({
  caseId,
  engagementId,
  messages,
  send = sendStaffInstructorMessage,
}: {
  caseId: string
  engagementId: string | null
  messages: StaffMsg[]
  send?: (caseId: string, engagementId: string, body: string) => Promise<void>
}) {
  const [pending, start] = useTransition()
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  if (!engagementId) {
    return (
      <p className="text-sm text-text-low">
        Assign an instructor to open a private staff↔instructor channel.
      </p>
    )
  }

  function submit() {
    const body = value.trim()
    if (!body || !engagementId) return
    start(async () => {
      try {
        await send(caseId, engagementId, body)
        setValue("")
        ref.current?.focus()
      } catch {
        toast.error("Couldn't send. Try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="space-y-2">
        {messages.length === 0 && (
          <li className="text-sm text-text-low">No messages yet — this channel is private to staff and the instructor.</li>
        )}
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border bg-card p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-text-low">
              <span>
                {m.senderName ?? "—"} · <span className="capitalize">{m.senderRole ?? "—"}</span>
              </span>
              <span>{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-text-mid">{m.body}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Message the instructor (never share applicant disclosures)…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
          }}
        />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !value.trim()} size="sm">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
