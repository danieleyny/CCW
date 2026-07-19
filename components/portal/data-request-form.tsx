"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FileDown, PencilLine, Trash2 } from "lucide-react"
import { submitDataRequest } from "@/app/portal/privacy/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const KINDS = [
  { key: "access", label: "Send me a copy", icon: FileDown, hint: "We'll put together everything we hold for your case." },
  { key: "correction", label: "Fix something", icon: PencilLine, hint: "Tell us what's wrong and we'll correct it." },
  {
    key: "deletion",
    label: "Delete my data",
    icon: Trash2,
    hint: "Read what deletion does, below, before you ask for this — it can't be undone.",
  },
] as const

/**
 * Deliberately a two-step: pick, then confirm. Deletion is irreversible and
 * shouldn't be one click away from a mis-tap.
 */
export function DataRequestForm() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"] | null>(null)
  const [pending, start] = useTransition()

  const selected = KINDS.find((k) => k.key === kind)

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {KINDS.map((k) => {
          const Icon = k.icon
          const active = kind === k.key
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(active ? null : k.key)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                active ? "border-brass bg-brass/10 text-text-hi" : "hover:border-hairline-strong"
              )}
            >
              <Icon className={cn("size-4 shrink-0", k.key === "deletion" ? "text-danger" : "text-brass")} />
              {k.label}
            </button>
          )
        })}
      </div>

      {selected && (
        <form
          action={(fd) =>
            start(async () => {
              const res = await submitDataRequest(fd)
              if (res.error) toast.error(res.error)
              else {
                toast.success("Request filed — we'll follow up by email.")
                setKind(null)
              }
            })
          }
          className="space-y-2 rounded-md border bg-surface-2 p-3"
        >
          <input type="hidden" name="kind" value={selected.key} />
          <p className="text-xs text-text-mid">{selected.hint}</p>
          <textarea
            name="detail"
            rows={3}
            placeholder="Anything you'd like us to know (optional)."
            className="w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" disabled={pending} variant={selected.key === "deletion" ? "outline" : "default"}>
            {pending ? "Filing…" : `Submit request`}
          </Button>
        </form>
      )}
    </div>
  )
}
