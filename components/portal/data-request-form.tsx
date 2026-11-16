"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FileDown, PencilLine, Trash2 } from "lucide-react"
import { submitDataRequest } from "@/app/portal/privacy/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

type RequestKind = "access" | "correction" | "deletion"

/**
 * Deliberately a two-step: pick, then confirm. Deletion is irreversible and
 * shouldn't be one click away from a mis-tap.
 */
export function DataRequestForm() {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const kinds = [
    { key: "access" as const, label: t.sendCopy, icon: FileDown, hint: t.sendCopyHint },
    { key: "correction" as const, label: t.fixSomething, icon: PencilLine, hint: t.fixSomethingHint },
    { key: "deletion" as const, label: t.deleteData, icon: Trash2, hint: t.deleteDataHint },
  ]
  const [kind, setKind] = useState<RequestKind | null>(null)
  const [pending, start] = useTransition()

  const selected = kinds.find((k) => k.key === kind)

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {kinds.map((k) => {
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
                toast.success(t.requestFiled)
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
            placeholder={t.requestDetailPlaceholder}
            className="w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" disabled={pending} variant={selected.key === "deletion" ? "outline" : "default"}>
            {pending ? t.filingRequest : t.submitRequest}
          </Button>
        </form>
      )}
    </div>
  )
}
