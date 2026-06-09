"use client"

import { useEffect, useState } from "react"
import { brand } from "@/config/brand"
import { cn } from "@/lib/utils"

const READOUTS = ["CALIBRATING OPTICS", "SECURING SESSION", "SYSTEM ONLINE"]

/**
 * One-time-per-session cinematic boot overlay, themed to the precision/instrument
 * identity: a reticle assembles from two converging rings and locks, the CARRY
 * wordmark resolves in with the prestige metallic fill, a mono status line cycles
 * three short readouts, and a brass calibration bar completes — then the overlay
 * exits with an iris-wipe reveal (~2s total).
 *
 * Click/tap to skip. Skipped entirely under prefers-reduced-motion and on repeat
 * visits within the session (sessionStorage guard). Not a focus trap.
 */
export function BootIntro() {
  const [show, setShow] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [pct, setPct] = useState(0)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (sessionStorage.getItem("carry-booted")) return
    sessionStorage.setItem("carry-booted", "1")
    // Intentional one-shot: decide to show the boot overlay on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true)

    const raf = requestAnimationFrame(() => setPct(100))
    const s1 = window.setTimeout(() => setStep(1), 700)
    const s2 = window.setTimeout(() => setStep(2), 1300)
    const leave = window.setTimeout(() => setLeaving(true), 1850)
    const done = window.setTimeout(() => setShow(false), 2400)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(s1)
      window.clearTimeout(s2)
      window.clearTimeout(leave)
      window.clearTimeout(done)
    }
  }, [])

  if (!show) return null

  return (
    <div
      onClick={() => {
        setLeaving(true)
        window.setTimeout(() => setShow(false), 550)
      }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background",
        leaving && "boot-iris pointer-events-none"
      )}
    >
      {/* faint scan sweep on entry */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-32 bg-gradient-to-b from-signal/15 to-transparent"
        style={{ animation: "boot-scan 1.4s ease-in-out" }}
      />

      {/* Reticle: two converging rings + crosshair ticks + a core lock dot */}
      <div className="relative grid size-28 place-items-center sm:size-32" aria-hidden>
        <span className="boot-ring-outer absolute inset-0 rounded-full border border-brass/50" />
        <span className="boot-ring-inner absolute inset-[18%] rounded-full border border-signal/40" />
        {/* crosshair ticks */}
        <span className="boot-core absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-brass/60" />
        <span className="boot-core absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-brass/60" />
        <span className="boot-core absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-brass/60" />
        <span className="boot-core absolute right-0 top-1/2 h-px w-3 -translate-y-1/2 bg-brass/60" />
        {/* core lock */}
        <span className="boot-core flex size-9 items-center justify-center rounded-full bg-brass text-base font-bold text-brand-foreground sm:size-10">
          {brand.logo.mark}
        </span>
      </div>

      {/* Wordmark resolves in with prestige metallic fill */}
      <div className="boot-word text-prestige mt-6 font-display text-3xl font-semibold tracking-[0.08em]">
        {brand.logo.wordmark}
      </div>

      {/* Calibration bar (brass) */}
      <div className="mt-6 h-px w-56 overflow-hidden bg-surface-3">
        <div
          className="h-full bg-brass transition-[width] duration-[1500ms] ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Cycling mono status readouts */}
      <div className="mt-3 h-4 font-mono text-[10px] uppercase tracking-[0.28em] text-text-mid">
        {READOUTS[step]}
      </div>
    </div>
  )
}
