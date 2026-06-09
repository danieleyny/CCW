"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Instrument-style stat readout: hairline frame + brass corner ticks, a large
 * mono number that counts up on mount, and a mono caption. SSR renders the final
 * value (no-JS safe); the count-up is a progressive enhancement.
 */
export function HudStat({
  value,
  label,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number
  label: string
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    let raf = 0
    let start = 0
    const dur = 1100
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <div
      className={cn(
        "relative rounded-md border border-hairline bg-surface-1/60 px-2 py-5 text-center sm:px-5 sm:py-6",
        className
      )}
    >
      <span aria-hidden className="absolute left-1 top-1 size-2 border-l border-t border-brass/50" />
      <span aria-hidden className="absolute right-1 top-1 size-2 border-r border-t border-brass/50" />
      <span aria-hidden className="absolute bottom-1 left-1 size-2 border-b border-l border-brass/50" />
      <span aria-hidden className="absolute bottom-1 right-1 size-2 border-b border-r border-brass/50" />
      <div className="text-prestige font-display text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-4xl">
        {prefix}
        {display.toLocaleString("en-US")}
        {suffix}
      </div>
      <div className="engraved mt-2 text-[0.625rem] sm:text-[0.6875rem]">{label}</div>
    </div>
  )
}
