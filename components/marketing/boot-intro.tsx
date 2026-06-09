"use client"

import { useEffect, useState } from "react"
import { brand } from "@/config/brand"
import { cn } from "@/lib/utils"

/**
 * One-time-per-session HUD boot overlay. Hairline sweep + brass wordmark + a
 * calibration bar, then wipes away (~1.5s). Click to skip. Skipped entirely on
 * reduced-motion and on repeat visits within the session.
 */
export function BootIntro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (sessionStorage.getItem("carry-booted")) return
    sessionStorage.setItem("carry-booted", "1")
    // Intentional one-shot: decide to show the boot overlay on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true)
    const raf = requestAnimationFrame(() => setPct(100))
    const t1 = window.setTimeout(() => setLeaving(true), 1500)
    const t2 = window.setTimeout(() => setShow(false), 2100)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  if (!show) return null

  return (
    <div
      onClick={() => {
        setLeaving(true)
        window.setTimeout(() => setShow(false), 500)
      }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-500",
        leaving && "pointer-events-none opacity-0"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-32 bg-gradient-to-b from-signal/15 to-transparent"
        style={{ animation: "boot-scan 1.4s ease-in-out" }}
      />
      <div className="flex items-center gap-2.5 font-display text-3xl font-semibold tracking-tight">
        <span className="flex size-10 items-center justify-center rounded-md bg-brass text-lg font-bold text-brand-foreground">
          {brand.logo.mark}
        </span>
        {brand.logo.wordmark}
      </div>
      <div className="mt-7 h-px w-60 overflow-hidden bg-surface-3">
        <div
          className="h-full bg-brass transition-[width] duration-[1300ms] ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-text-mid">
        System Online {" // "} Optics Calibrated
      </div>
    </div>
  )
}
