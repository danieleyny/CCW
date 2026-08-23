"use client"

import { useState, useTransition } from "react"
import { Check, Pencil, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { setCaseFact } from "@/app/portal/facts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** One fact: label, value, where it came from, and how many forms use it. Editing
 *  propagates to every form (setCaseFact writes the shared case_facts row). */
export function FactRow({
  caseId,
  factKey,
  label,
  value,
  uses,
  kind,
}: {
  caseId: string
  factKey: string
  label: string
  value: string
  uses: number
  /** "editable" | "derived" (read-only) | "ssn" (never shows the value) */
  kind: "editable" | "derived" | "ssn"
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const [pending, start] = useTransition()

  function save(next: string) {
    start(async () => {
      const r = await setCaseFact(caseId, factKey, next)
      if (r.error) {
        toast.error(r.error)
        return
      }
      toast.success("Saved — updated on every form that uses it.")
      setEditing(false)
    })
  }

  const usesLabel = uses > 0 ? `used on ${uses} form${uses === 1 ? "" : "s"}` : "not on a form yet"

  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">
          {label}
          {kind === "derived" && <Lock className="ml-1 inline size-3 text-text-low" />}
        </div>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <Input
              autoFocus
              type={kind === "ssn" ? "password" : "text"}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="h-9 max-w-[16rem]"
            />
            <Button size="sm" className="min-h-[36px]" disabled={pending} onClick={() => save(val)}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </Button>
          </div>
        ) : (
          <div className="mt-0.5 text-sm text-text-mid">
            {kind === "ssn" ? (value ? "On file (hidden) · never shared with your sponsor" : "Not set") : value || <span className="text-text-low">—</span>}
          </div>
        )}
        <div className="mt-0.5 text-[11px] text-text-low">{usesLabel}</div>
      </div>
      {kind !== "derived" && !editing && (
        <Button size="sm" variant="ghost" className="min-h-[36px]" onClick={() => { setVal(kind === "ssn" ? "" : value); setEditing(true) }}>
          <Pencil className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
