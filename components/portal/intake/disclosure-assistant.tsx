"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { draftMyDisclosure } from "@/app/portal/intake/ai-actions"
import type { ArrestEntry } from "@/lib/intake/answers"
import { Button } from "@/components/ui/button"

/**
 * PART C / Phase 12 — the guardrailed writing assistant, applicant-facing.
 *
 * Only rendered when AI is enabled (off by default). It organizes the
 * applicant's OWN stated facts into a first-person draft they then edit and own.
 * The copy makes the boundary explicit: it's a writing aid, candor is required,
 * and a person reviews it before it's used.
 */
export function DisclosureAssistant({
  arrest,
  onDraft,
}: {
  arrest: ArrestEntry
  onDraft: (draft: string) => void
}) {
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-signal"
        onClick={() => setOpen(true)}
        disabled={!arrest.narrative?.trim()}
        title={arrest.narrative?.trim() ? undefined : "Write a few words about what happened first"}
      >
        <Sparkles className="size-4" /> Help me word this
      </Button>
    )
  }

  return (
    <div className="w-full rounded-md border border-signal/30 bg-signal/5 p-2.5 text-xs">
      <p className="text-text-mid">
        This organizes <b>your own words</b> into a clear statement — it never adds facts, never
        suggests leaving anything out, and a person on our team reads it before it&apos;s used. It
        won&apos;t give legal advice; anything about what your record <i>means</i> goes to an attorney.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await draftMyDisclosure({
                kind: "arrest",
                occurredOn: arrest.occurredOn,
                jurisdiction: arrest.jurisdiction,
                disposition: arrest.disposition,
                whatHappened: arrest.narrative ?? "",
              })
              if (res.error) toast.error(res.error)
              else if (res.draft) {
                onDraft(res.draft)
                toast.success("Draft ready — review and edit it in your own voice.")
                setOpen(false)
              }
            })
          }
        >
          {pending ? "Organizing…" : "Organize my facts"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
