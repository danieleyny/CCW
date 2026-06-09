"use client"

import { useState, useRef, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime, initials } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface MessageRow {
  id: string
  body: string
  created_at: string
  senderName: string | null
  senderRole: string | null
}

/**
 * Shared client↔staff thread. The `send` server action is injected so the same
 * UI serves the admin case file and the client portal with the right authz.
 */
export function MessageThread({
  caseId,
  messages,
  send,
  placeholder = "Write a message…",
}: {
  caseId: string
  messages: MessageRow[]
  send: (caseId: string, body: string) => Promise<void>
  placeholder?: string
}) {
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")

  function submit() {
    const body = value.trim()
    if (!body) return
    startTransition(async () => {
      try {
        await send(caseId, body)
        setValue("")
        ref.current?.focus()
      } catch {
        toast.error("Couldn't send. Try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="space-y-3">
        {messages.length === 0 && (
          <li className="text-sm text-muted-foreground">No messages yet. Say hello!</li>
        )}
        {messages.map((m) => {
          const isStaff = m.senderRole === "staff" || m.senderRole === "admin"
          return (
            <li key={m.id} className="flex gap-3">
              <Avatar className="size-8">
                <AvatarFallback
                  className={cn(
                    "text-xs",
                    isStaff ? "bg-signal-dim text-signal" : "bg-brass/15 text-brass-bright"
                  )}
                >
                  {initials(m.senderName ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.senderName ?? "System"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(m.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
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
