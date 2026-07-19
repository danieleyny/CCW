"use client"

import { useState } from "react"
import { Scale, Gavel } from "lucide-react"
import { setRequirementLegalStatus } from "@/app/admin/legal/actions"
import { Button } from "@/components/ui/button"
import { UNENFORCED_STATUSES } from "@/lib/legal-status"
import { cn } from "@/lib/utils"

/**
 * PART A / Phase 1 — the attorney's control over a rule's enforcement status.
 *
 * Deliberately plain: a select and two text fields. The citation is free text
 * because we must never offer a menu of cases to pick from — that would invite
 * attaching a plausible-looking citation to a rule it doesn't support.
 */

export const LEGAL_STATUS_META = {
  enforced: { label: "Enforced", hint: "In force today.", tone: "text-text-mid" },
  enjoined_not_enforced: {
    label: "Enjoined — not enforced",
    hint: "A court has stopped it. We must not require it; it can never block filing.",
    tone: "text-signal",
  },
  contested: {
    label: "Contested",
    hint: "Under active challenge but still enforced. Stays required; flagged for awareness.",
    tone: "text-warn",
  },
  repealed: {
    label: "Repealed",
    hint: "No longer law. It can never block filing.",
    tone: "text-text-low",
  },
} as const

export type LegalStatusKey = keyof typeof LEGAL_STATUS_META

export function LegalStatusBadge({ status }: { status: LegalStatusKey }) {
  if (status === "enforced") return null
  const meta = LEGAL_STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
        status === "contested" ? "bg-warn/15 text-warn" : "bg-signal-dim text-signal"
      )}
    >
      <Gavel className="size-3" />
      {meta.label}
    </span>
  )
}

export function LegalStatusEditor({
  id,
  reqCode,
  status,
  note,
  citation,
}: {
  id: string
  reqCode: string
  status: LegalStatusKey
  note: string | null
  citation: string | null
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<LegalStatusKey>(status)

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="text-text-low" onClick={() => setOpen(true)}>
        <Scale className="size-3.5" /> Legal status
      </Button>
    )
  }

  return (
    <form action={setRequirementLegalStatus} className="mt-3 w-full space-y-2 rounded-md border bg-surface-2 p-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs text-text-mid">
        Enforcement status for <span className="font-mono">{reqCode}</span>. Recording a status counts
        as your review — it stamps your name and today&apos;s date.
      </p>

      <label className="block text-xs">
        <span className="text-text-low">Status</span>
        <select
          name="legal_status"
          defaultValue={status}
          onChange={(e) => setDraft(e.target.value as LegalStatusKey)}
          className="mt-1 w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
        >
          {(Object.keys(LEGAL_STATUS_META) as LegalStatusKey[]).map((k) => (
            <option key={k} value={k}>
              {LEGAL_STATUS_META[k].label}
            </option>
          ))}
        </select>
      </label>
      <p className={cn("text-xs", LEGAL_STATUS_META[draft].tone)}>{LEGAL_STATUS_META[draft].hint}</p>
      {UNENFORCED_STATUSES.includes(draft) && (
        <p className="text-xs text-text-low">
          Saving this forces the rule non-blocking. The database enforces that — it cannot be a filing
          blocker while a court has stopped it.
        </p>
      )}

      <label className="block text-xs">
        <span className="text-text-low">Citation</span>
        <input
          name="legal_citation"
          defaultValue={citation ?? ""}
          placeholder="e.g. Antonyuk v. James (2d Cir.) — leave blank rather than guess"
          className="mt-1 w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block text-xs">
        <span className="text-text-low">Note</span>
        <textarea
          name="legal_status_note"
          defaultValue={note ?? ""}
          rows={3}
          placeholder="What the applicant and staff should understand about this rule's status."
          className="mt-1 w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
        />
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Save status
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
