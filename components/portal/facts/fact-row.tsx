"use client"

import { useRef, useState, useTransition } from "react"
import { Check, Pencil, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { setCaseFact } from "@/app/portal/facts/actions"
import type { FactRowMeta } from "@/lib/facts/details-view"

/**
 * One fact. An EMPTY editable field is a live input — click and type, no pencil. A
 * FILLED field shows the value read-only with a pencil to reopen it. Saving happens
 * on blur (or Enter, which moves to the next field); success is an inline ✓ that
 * fades, never a toast — 36 toasts is a punishment. A failed save keeps the typing
 * in the box and shows an inline error. Editing propagates to every form.
 */
type Status = "idle" | "saving" | "saved" | "error"

export function FactRow({
  caseId,
  meta,
  value,
  onSaved,
  onSsnSaved,
  focusNext,
}: {
  caseId: string
  meta: FactRowMeta
  /** Current value from the parent's client state (drives collapse + the meter). */
  value: string
  onSaved: (key: string, next: string) => void
  onSsnSaved: () => void
  /** Move focus to the next editable input in the list (Enter / tab-through). */
  focusNext: (from: HTMLElement) => boolean
}) {
  const { key, label, type, kind, options, placeholder, uses, onFile, optional, example } = meta
  const [editing, setEditing] = useState(false) // pencil opened a filled/ssn row
  const [showExample, setShowExample] = useState(false)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(value) // last persisted value (ssn: always "")
  const [status, setStatus] = useState<Status>("idle")
  const [, start] = useTransition()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only a positive reuse signal — never "not on a form yet", which read as "why am I
  // filling this?" on a field that does feed the application.
  const usesLabel = uses > 0 ? `used on ${uses} form${uses === 1 ? "" : "s"}` : ""

  // When does the row show an input rather than a read-only value?
  //  editable → whenever it's empty, or being edited/focused
  //  ssn      → when none is on file, or being edited/focused (never shows a value)
  const asInput = kind === "ssn" ? !onFile || editing || focused : value.trim() === "" || editing || focused

  function commit(next: string) {
    if (next === saved) {
      setEditing(false)
      return
    }
    setStatus("saving")
    start(async () => {
      const r = await setCaseFact(caseId, key, next, { skipRevalidate: true })
      if (r.error) {
        setStatus("error")
        toast.error(r.error)
        return // keep the draft in the box; blurring again retries
      }
      setStatus("saved")
      setSaved(next)
      setEditing(false)
      if (kind === "ssn") {
        setDraft("")
        onSsnSaved()
      } else {
        onSaved(key, next)
      }
      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setStatus("idle"), 1500)
    })
  }

  function onBlur() {
    setFocused(false)
    commit(draft) // no-op when unchanged
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const moved = focusNext(e.currentTarget as HTMLElement) // blurs current → saves
      if (!moved) (e.currentTarget as HTMLElement).blur()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setDraft(saved) // revert
      setEditing(false)
      ;(e.currentTarget as HTMLElement).blur()
    }
  }

  const inputId = `fact-${key}`
  const commonProps = {
    id: inputId,
    "data-fact-input": true as const,
    value: draft,
    autoFocus: editing,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFocused(true)
      if (draft) (e.currentTarget as HTMLInputElement).select?.()
    },
    onBlur,
    onKeyDown,
    className:
      "h-9 w-full max-w-[20rem] rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40",
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {asInput ? (
            <label htmlFor={inputId} className="cursor-text text-sm font-medium">
              {label}
            </label>
          ) : (
            <div className="text-sm font-medium">{label}</div>
          )}
          {optional && (
            <span className="rounded-full border border-signal/40 bg-signal/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal">
              Only if it applies
            </span>
          )}
        </div>

        {asInput ? (
          <div className="mt-1 flex items-center gap-2">
            {options ? (
              <select
                {...commonProps}
                onChange={(e) => {
                  setDraft(e.target.value)
                  commit(e.target.value) // a select IS the commit
                }}
              >
                <option value="">Select…</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...commonProps}
                type={kind === "ssn" ? "password" : type === "date" ? "date" : type === "phone" ? "tel" : "text"}
                inputMode={type === "phone" ? "tel" : type === "zip" || kind === "ssn" ? "numeric" : undefined}
                maxLength={type === "zip" ? 5 : kind === "ssn" ? 4 : undefined}
                autoComplete={kind === "ssn" ? "off" : undefined}
                placeholder={placeholder ?? (kind === "ssn" ? "last 4 digits" : undefined)}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
            <StatusMark status={status} />
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-2 text-sm text-text-mid">
            {kind === "ssn"
              ? "On file (hidden) · never shared with your sponsor"
              : value || <span className="text-text-low">—</span>}
            <StatusMark status={status} />
          </div>
        )}

        {example && (
          <div className="mt-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowExample((v) => !v)}
              className="text-[11px] font-medium text-signal underline-offset-2 hover:underline"
            >
              {showExample ? "Hide example" : "Show me an example"}
            </button>
            {showExample && (
              <p className="mt-1 rounded-md border border-hairline bg-surface-2/40 p-2 text-[12px] italic text-text-mid">
                &ldquo;{example}&rdquo;
              </p>
            )}
          </div>
        )}
        {usesLabel && <div className="mt-0.5 text-[11px] text-text-low">{usesLabel}</div>}
        {status === "error" && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-danger">
            <AlertCircle className="size-3" /> Couldn&apos;t save — click away to try again.
          </div>
        )}
      </div>

      {/* Pencil for a filled/ssn-on-file row. tabIndex -1 so it never sits between two
          empty inputs in the tab order; still clickable. */}
      {!asInput && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Edit ${label}`}
          className="shrink-0 rounded-md p-2 text-text-low hover:bg-surface-3 hover:text-foreground"
          onClick={() => {
            setDraft(kind === "ssn" ? "" : value)
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function StatusMark({ status }: { status: Status }) {
  if (status === "saving") return <Loader2 className="size-3.5 animate-spin text-text-low" />
  if (status === "saved") return <Check className="size-3.5 text-ok transition-opacity" />
  return null
}
