"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { partsFromIsoDay as partsFrom, isoDayFromParts as compose } from "@/lib/intake/birthdate"

/**
 * Date-of-birth entry that doesn't make you scroll a native picker back through
 * the decades. The YEAR IS TYPED — that's the whole point. Month is a dropdown,
 * day and year are numeric inputs.
 *
 * CANONICAL VALUE UNCHANGED: emits the same `YYYY-MM-DD` string (the zod `isoDay`
 * shape). Emits "" whenever the three parts don't yet form a real calendar date,
 * so the wizard's existing "enter your DOB" / under-21 validation fires exactly
 * as before. Only for birthdates — near dates keep their native `type="date"`.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const SELECT_CLASS =
  "h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40"

export function DateOfBirthField({
  value,
  onChange,
  invalid = false,
}: {
  value: string
  onChange: (dob: string) => void
  invalid?: boolean
}) {
  const [{ y, m, d }, setParts] = useState(() => partsFrom(value))
  const dayRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  // Re-sync when the parent hydrates a full date (e.g. opening an existing case
  // to edit) that differs from what's typed. Never clobbers in-progress typing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value && value !== compose(y, m, d)) setParts(partsFrom(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function update(next: { y?: string; m?: string; d?: string }) {
    const merged = { y, m, d, ...next }
    setParts(merged)
    onChange(compose(merged.y, merged.m, merged.d))
  }

  // Accept a pasted full date in either YYYY-MM-DD or M/D/YYYY form.
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").trim()
    let mm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
    let parsed: { y: string; m: string; d: string } | null = null
    if (mm) parsed = { y: mm[1], m: mm[2], d: mm[3] }
    else if ((mm = /^(\d{1,2})[/](\d{1,2})[/](\d{4})$/.exec(text))) parsed = { y: mm[3], m: mm[1], d: mm[2] }
    if (parsed) {
      e.preventDefault()
      setParts(parsed)
      onChange(compose(parsed.y, parsed.m, parsed.d))
    }
  }

  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2" onPaste={onPaste}>
      <select
        aria-label="Birth month"
        value={m}
        onChange={(e) => {
          update({ m: e.target.value })
          if (e.target.value) dayRef.current?.focus()
        }}
        className={cn(SELECT_CLASS, invalid && "border-danger ring-2 ring-danger/30")}
        {...(invalid ? { "aria-invalid": true as const, "data-intake-invalid": "" } : {})}
      >
        <option value="">Month…</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </select>
      <Input
        ref={dayRef}
        inputMode="numeric"
        aria-label="Birth day"
        placeholder="Day"
        maxLength={2}
        value={d}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2)
          update({ d: v })
          if (v.length === 2) yearRef.current?.focus()
        }}
        className="h-11"
      />
      <Input
        ref={yearRef}
        inputMode="numeric"
        aria-label="Birth year"
        placeholder="Year"
        maxLength={4}
        value={y}
        onChange={(e) => update({ y: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        className="h-11"
      />
    </div>
  )
}
