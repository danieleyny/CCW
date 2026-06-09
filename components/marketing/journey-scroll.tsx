"use client"

import { useEffect, useRef, useState } from "react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { cn } from "@/lib/utils"

/** The 13 stages, condensed into 5 digestible phases for the home journey. */
const PHASES = [
  {
    n: 1,
    title: "Qualify & Enroll",
    short: "Enroll",
    blurb: "Confirm your eligibility, choose your package, and get started — no guesswork.",
  },
  {
    n: 2,
    title: "Train",
    short: "Train",
    blurb:
      "16-hour classroom + 2-hour live-fire with vetted DCJS instructors, scheduled around you.",
  },
  {
    n: 3,
    title: "Assemble & Notarize",
    short: "Assemble",
    blurb:
      "References, cohabitant affidavits, social-media history, and safe photos — collected, notarized, and QA'd.",
  },
  {
    n: 4,
    title: "File & Investigate",
    short: "File",
    blurb:
      "Filed on the NYPD portal, then fingerprinting, the in-person interview, and the background investigation.",
  },
  {
    n: 5,
    title: "Licensed",
    short: "Licensed",
    blurb: "Your decision arrives — and we track your 3-year renewal so you never lapse.",
  },
]

function MiniReticle() {
  return (
    <span className="relative flex size-5 items-center justify-center" aria-hidden>
      <span className="reticle-active absolute inset-0 rounded-full border border-signal/80" />
      <span className="absolute -top-0.5 left-1/2 h-1 w-px -translate-x-1/2 bg-signal/70" />
      <span className="absolute -bottom-0.5 left-1/2 h-1 w-px -translate-x-1/2 bg-signal/70" />
      <span className="absolute top-1/2 -left-0.5 h-px w-1 -translate-y-1/2 bg-signal/70" />
      <span className="absolute top-1/2 -right-0.5 h-px w-1 -translate-y-1/2 bg-signal/70" />
      <span className="size-1 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
    </span>
  )
}

export function JourneyScroll() {
  const sectionRef = useRef<HTMLElement>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const sec = sectionRef.current
    if (!sec) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = sec.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        if (total <= 0) return
        const p = Math.min(1, Math.max(0, -rect.top / total))
        setIdx(Math.min(PHASES.length - 1, Math.floor(p * PHASES.length)))
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const phase = PHASES[idx]
  const nn = String(phase.n).padStart(2, "0")

  return (
    <>
      {/* Desktop: a compact sticky scroll sequence (5 phases) */}
      <section
        ref={sectionRef}
        className="relative hidden border-y border-hairline bg-surface-1/20 md:block"
        style={{ height: `${PHASES.length * 22}vh` }}
      >
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-12 px-6">
            <div className="relative">
              <SectionEyebrow>The Process</SectionEyebrow>
              <div className="relative mt-8 transition-opacity duration-300">
                <span className="pointer-events-none absolute -left-2 -top-24 select-none font-display text-[12rem] font-bold leading-none text-brass/[0.07]">
                  {nn}
                </span>
                <div className="relative">
                  <div className="engraved text-brass">
                    Phase {nn} {" / "} {String(PHASES.length).padStart(2, "0")}
                  </div>
                  <h3 className="mt-3 max-w-xl font-display text-5xl font-semibold tracking-tight">
                    {phase.title}
                  </h3>
                  <p className="mt-4 max-w-md text-lg text-text-mid">{phase.blurb}</p>
                </div>
              </div>
              <div className="mt-10 flex items-center gap-3">
                <div className="h-1 w-64 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-brass transition-[width] duration-300"
                    style={{ width: `${((idx + 1) / PHASES.length) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-signal">
                  {idx + 1}/{PHASES.length}
                </span>
              </div>
            </div>

            <ol className="flex flex-col gap-4">
              {PHASES.map((s, i) => {
                const done = i < idx
                const current = i === idx
                return (
                  <li key={s.title} className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center">
                      {current ? (
                        <MiniReticle />
                      ) : done ? (
                        <span className="size-2 rounded-full bg-brass/80" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-hairline-strong" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm uppercase tracking-wider transition-colors",
                        current ? "text-foreground" : done ? "text-text-mid" : "text-text-low/60"
                      )}
                    >
                      {s.short}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* Mobile: a compact phase list */}
      <section className="border-y border-hairline bg-surface-1/20 md:hidden">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <SectionEyebrow>The Process</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Five phases, navigated with precision
          </h2>
          <ol className="relative mt-8 space-y-3 border-l border-hairline pl-6">
            {PHASES.map((s) => (
              <Reveal key={s.title}>
                <li className="relative">
                  <span className="absolute -left-[31px] top-3 size-2 rounded-full bg-brass shadow-[0_0_8px_var(--brass-glow)]" />
                  <div className="rounded-lg border border-hairline bg-card p-4">
                    <div className="engraved text-brass">
                      Phase {String(s.n).padStart(2, "0")}
                    </div>
                    <div className="mt-1 font-display text-lg font-semibold">{s.title}</div>
                    <p className="mt-1 text-sm text-text-mid">{s.blurb}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
