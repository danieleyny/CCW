"use client"

import { useId } from "react"
import { Input } from "@/components/ui/input"
import { NY_COUNTIES, isKnownNyCounty } from "@/lib/ny-counties"

/**
 * A county field: autocompletes the 62 NY counties (native <datalist>, so it degrades to a
 * plain typable input everywhere), ALLOWS a value outside the list — an applicant may have
 * lived out of state — but FLAGS an unrecognised one inline for confirmation, never blocks
 * (finding 7). One component wherever a county is captured.
 */
export function CountyInput({
  value,
  onChange,
  id,
  name,
  placeholder = "County",
  className,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  name?: string
  placeholder?: string
  className?: string
}) {
  const listId = useId()
  const unknown = !isKnownNyCounty(value)
  return (
    <div className="space-y-1">
      <Input
        id={id}
        name={name}
        list={listId}
        autoComplete="off"
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={undefined}
      />
      <datalist id={listId}>
        {NY_COUNTIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {unknown && (
        <p className="text-[11px] text-warn">
          Not a New York county — fine if this is out of state, just double-check the spelling matches the document.
        </p>
      )}
    </div>
  )
}
