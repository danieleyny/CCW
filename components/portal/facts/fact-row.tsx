"use client"

import { useRef, useState, useTransition } from "react"
import { AlertCircle, Check, CheckCircle2, FileText, Loader2, LockKeyhole, Pencil } from "lucide-react"
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
  const { key, label, type, kind, options, placeholder, uses, onFile, optional, example, owner } = meta
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
  const usesLabel = uses > 0 ? `Used on ${uses} form${uses === 1 ? "" : "s"}` : ""

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
  // A1 — a REQUIRED, empty field carries a soft warn-tone ring ("look here", not an
  // error). Optional fields never ring; the ring clears the instant a value is typed
  // (driven by the live draft, no save round-trip). Not the destructive red — at first
  // load every field is empty, and an error-red page is the wrong first impression.
  const needsRing = kind === "editable" && !optional && draft.trim() === "" && !focused
  const isWide = !!example || /address|street|method|firm/i.test(key)
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
    className: `details-fact-input ${needsRing ? "is-required-empty" : optional ? "is-optional" : ""}`,
  }

  return (
    <div data-fact-field className={`details-field ${isWide ? "is-wide" : ""} ${meta.showWhen ? "is-conditional" : ""}`}>
      <div className="details-field-label-row">
        <label htmlFor={inputId}>{label}</label>
        <div className="details-field-meta">
          {optional && <span className="details-optional-tag">Optional</span>}
          {owner === "sponsor" && <span className="details-sponsor-tag">From your sponsor</span>}
          {usesLabel && (
            <span className="details-uses-label">
              <FileText aria-hidden className="size-3" /> {usesLabel}
            </span>
          )}
        </div>
      </div>

      {asInput ? (
        <div className="details-input-wrap">
          {kind === "ssn" && <LockKeyhole aria-hidden className="details-input-lock size-4" />}
          <div className="flex min-w-0 flex-1 items-center gap-2">
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
                placeholder={placeholder ?? (kind === "ssn" ? "••••" : undefined)}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
            <StatusMark status={status} />
          </div>
        </div>
      ) : (
        <div className="details-filled-row">
          <CheckCircle2 aria-hidden className="size-[22px] shrink-0 text-ok" />
          <span className="min-w-0 flex-1 break-words">
            {kind === "ssn" ? "On file ••••" : value || <span className="text-text-low">—</span>}
          </span>
          <StatusMark status={status} />
          <button
            type="button"
            aria-label={`Edit ${label}`}
            className="details-pencil-button"
            onClick={() => {
              setDraft(kind === "ssn" ? "" : value)
              setEditing(true)
            }}
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        </div>
      )}

      {example && asInput && (
        <div className="details-example-wrap">
        <button
          type="button"
          onClick={() => setShowExample((current) => !current)}
          className="details-example-toggle"
        >
          {showExample ? "Hide example" : "Show me an example"}
        </button>
        {showExample && (
          <p className="details-example-strip">
            <span aria-hidden>✨</span> <strong>Example:</strong> {example}
          </p>
        )}
        </div>
      )}
      {status === "error" && (
        <div className="details-field-error">
          <AlertCircle aria-hidden className="size-3" /> Couldn&apos;t save — click away to try again.
        </div>
      )}
    </div>
  )
}

function StatusMark({ status }: { status: Status }) {
  if (status === "saving") return <Loader2 className="size-3.5 animate-spin text-text-low" />
  if (status === "saved") return <Check className="size-3.5 text-ok transition-opacity" />
  return null
}
