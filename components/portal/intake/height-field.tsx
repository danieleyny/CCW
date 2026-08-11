"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { inchesFromFeetInches, inchesFromCm, cmFromInches } from "@/lib/intake/measurements"

/**
 * Height entry that meets people where they think — in feet + inches — while the
 * application only ever stores a single integer of inches.
 *
 * CANONICAL VALUE UNCHANGED: this component's only output is `heightInches`
 * (integer, the same 24–96 the zod schema bounds). Feet/inches/cm are input
 * affordances; nothing new lands in the jsonb. Hydrating an existing value shows
 * it as feet + inches by default.
 */

type Unit = "ftin" | "in" | "cm"
const UNIT_KEY = "intake_height_unit"

const SELECT_CLASS =
  "h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40"

export function HeightField({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (inches: number | undefined) => void
}) {
  // Chosen unit sticks within the session (and across sessions) so someone who
  // thinks in cm isn't re-toggling every visit. Read after mount → no SSR skew.
  const [unit, setUnit] = useState<Unit>("ftin")
  useEffect(() => {
    try {
      const saved = localStorage.getItem(UNIT_KEY) as Unit | null
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "ftin" || saved === "in" || saved === "cm") setUnit(saved)
    } catch {
      // ignore blocked storage
    }
  }, [])
  function pickUnit(u: Unit) {
    setUnit(u)
    try {
      localStorage.setItem(UNIT_KEY, u)
    } catch {
      // best-effort
    }
  }

  const feet = value != null ? Math.floor(value / 12) : ""
  const inches = value != null ? value % 12 : ""

  function setFeetInches(f: number | "", i: number | "") {
    if (f === "" && i === "") return onChange(undefined)
    onChange(inchesFromFeetInches(f === "" ? 0 : f, i === "" ? 0 : i))
  }

  return (
    <div className="space-y-2">
      {/* Unit toggle */}
      <div className="flex gap-1" role="group" aria-label="Height unit">
        {(
          [
            ["ftin", "ft / in"],
            ["in", "inches"],
            ["cm", "cm"],
          ] as [Unit, string][]
        ).map(([u, label]) => (
          <button
            key={u}
            type="button"
            onClick={() => pickUnit(u)}
            aria-pressed={unit === u}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              unit === u
                ? "border-brass/40 bg-brass/10 text-brass"
                : "border-hairline text-text-low hover:text-text-mid"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Fixed min-height so switching units never shifts the layout. */}
      <div className="flex min-h-[2.75rem] items-center gap-2">
        {unit === "ftin" && (
          <>
            <select
              aria-label="Feet"
              value={feet}
              onChange={(e) => setFeetInches(e.target.value === "" ? "" : Number(e.target.value), inches)}
              className={cn(SELECT_CLASS, "w-full")}
            >
              <option value="">ft…</option>
              {[3, 4, 5, 6, 7, 8].map((f) => (
                <option key={f} value={f}>
                  {f} ft
                </option>
              ))}
            </select>
            <select
              aria-label="Inches"
              value={inches}
              onChange={(e) => setFeetInches(feet, e.target.value === "" ? "" : Number(e.target.value))}
              className={cn(SELECT_CLASS, "w-full")}
            >
              <option value="">in…</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {i} in
                </option>
              ))}
            </select>
          </>
        )}

        {unit === "in" && (
          <Input
            type="number"
            inputMode="numeric"
            min={24}
            max={96}
            aria-label="Height in inches"
            value={value ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              onChange(Number.isFinite(n) ? n : undefined)
            }}
            className="h-11"
          />
        )}

        {unit === "cm" && (
          <Input
            type="number"
            inputMode="numeric"
            min={60}
            max={245}
            aria-label="Height in centimeters"
            defaultValue={value != null ? cmFromInches(value) : ""}
            onChange={(e) => {
              const cm = parseInt(e.target.value, 10)
              onChange(Number.isFinite(cm) ? inchesFromCm(cm) : undefined)
            }}
            className="h-11"
          />
        )}
      </div>

      {/* Quiet confirmation of the stored value, so the canonical number is visible. */}
      {value != null && (
        <p className="text-[11px] text-text-low">
          = {value} in{unit !== "ftin" ? ` (${Math.floor(value / 12)} ft ${value % 12} in)` : ""}
        </p>
      )}
    </div>
  )
}
