"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserRound,
  CalendarDays,
  FolderCheck,
  ClipboardCheck,
  Handshake,
  type LucideIcon,
} from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { cn } from "@/lib/utils"

/**
 * V6 — the process, as a CLICK-DRIVEN stepper (no scroll interception; it
 * replaces the old scroll-hijack JourneyScroll). Five phases, condensed from the
 * 13 internal stages. Desktop: a real WAI-ARIA tablist — roving tabindex,
 * aria-selected, ←/→ + Home/End keys, prev/next buttons, dot indicators — over
 * one panel with a huge ghost numeral. Mobile: a scroll-snap carousel of cards.
 * Copy stays candor-safe — never promising speed or outcomes.
 */
const PHASES: {
  title: string
  short: string
  blurb: string
  icon: LucideIcon
}[] = [
  {
    title: "Qualify & enroll",
    short: "Qualify",
    icon: UserRound,
    blurb:
      "A two-minute eligibility check tells you exactly where you stand — no guesswork, no payment to start. Pick your package and we open your application.",
  },
  {
    title: "Train",
    short: "Train",
    icon: CalendarDays,
    blurb:
      "Book your 18-hour firearms safety course early — it's the longest-lead item, and the certificate expires six months after it's dated. We track the clock for you.",
  },
  {
    title: "Assemble",
    short: "Assemble",
    icon: FolderCheck,
    blurb:
      "References, statements, disclosures, and photos — we gather all the documents necessary and make sure the job gets done properly and simply.",
  },
  {
    title: "Review & file",
    short: "Review",
    icon: ClipboardCheck,
    blurb:
      "We check that every requirement is complete and correct. You review the finished packet, then submit your own application — with everything prepared so it's quick and right, and we're with you the whole way.",
  },
  {
    title: "Interview",
    short: "Interview",
    icon: Handshake,
    blurb:
      "The final stretch — fingerprinting, your interview, and the NYPD's review. We make sure everything you filed lines up and that you know exactly what to expect, so nothing sends you back to the start of the line.",
  },
]

const nn = (i: number) => String(i + 1).padStart(2, "0")

export function ProcessStepper() {
  const [idx, setIdx] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function select(i: number, focus = false) {
    const next = (i + PHASES.length) % PHASES.length
    setIdx(next)
    if (focus) tabRefs.current[next]?.focus()
  }

  function onTabKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault()
        select(idx + 1, true)
        break
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault()
        select(idx - 1, true)
        break
      case "Home":
        e.preventDefault()
        select(0, true)
        break
      case "End":
        e.preventDefault()
        select(PHASES.length - 1, true)
        break
    }
  }

  const phase = PHASES[idx]

  return (
    <section className="section-panel border-y border-hairline py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <SectionEyebrow>How we carry it</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Five phases. We carry the weight in each one.
          </h2>
          <p className="mt-4 text-text-mid">
            Here&apos;s what actually happens — and what we&apos;re doing at each step so you don&apos;t
            have to.
          </p>
        </div>

        {/* ── Desktop: tablist + panel ───────────────────────────────────── */}
        <div className="mt-12 hidden gap-10 md:grid md:grid-cols-[minmax(0,15rem)_1fr]">
          <div
            role="tablist"
            aria-label="The five phases"
            aria-orientation="vertical"
            className="flex flex-col gap-1"
          >
            {PHASES.map((p, i) => {
              const active = i === idx
              const Icon = p.icon
              return (
                <button
                  key={p.title}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  role="tab"
                  id={`phase-tab-${i}`}
                  aria-selected={active}
                  aria-controls={`phase-panel-${i}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={onTabKeyDown}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-hairline-strong bg-surface-1"
                      : "border-transparent hover:bg-surface-1/50"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums transition-colors",
                      active ? "text-brass-bright" : "text-text-low"
                    )}
                  >
                    {nn(i)}
                  </span>
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active ? "text-brass" : "text-text-low"
                    )}
                  />
                  <span
                    className={cn(
                      "font-display text-sm font-semibold transition-colors",
                      active ? "text-foreground" : "text-text-mid"
                    )}
                  >
                    {p.title}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            role="tabpanel"
            id={`phase-panel-${idx}`}
            aria-labelledby={`phase-tab-${idx}`}
            className="relative min-h-[16rem] overflow-hidden rounded-2xl border border-hairline bg-surface-1/60 p-8"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-2 -top-10 select-none font-display text-[11rem] font-bold leading-none text-brass/[0.06]"
            >
              {nn(idx)}
            </span>
            <div className="relative">
              <div className="engraved text-brass">
                Phase {nn(idx)} / {nn(PHASES.length - 1)}
              </div>
              <h3 className="mt-3 max-w-xl font-display text-4xl font-semibold tracking-tight">
                {phase.title}
              </h3>
              <p className="mt-4 max-w-lg text-lg text-text-mid">{phase.blurb}</p>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-2" aria-hidden>
                {PHASES.map((p, i) => (
                  <button
                    key={p.title}
                    tabIndex={-1}
                    onClick={() => select(i)}
                    aria-label={`Go to phase ${nn(i)}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === idx ? "w-6 bg-brass" : "w-1.5 bg-hairline-strong hover:bg-text-low"
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <StepButton label="Previous phase" onClick={() => select(idx - 1)}>
                  <ChevronLeft className="size-4" />
                </StepButton>
                <StepButton label="Next phase" onClick={() => select(idx + 1)}>
                  <ChevronRight className="size-4" />
                </StepButton>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile: scroll-snap carousel ───────────────────────────────── */}
        <ol className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {PHASES.map((p, i) => {
            const Icon = p.icon
            return (
              <li
                key={p.title}
                className="min-w-[82%] snap-center rounded-2xl border border-hairline bg-surface-1/60 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="engraved text-brass">
                    Phase {nn(i)} / {nn(PHASES.length - 1)}
                  </div>
                  <Icon className="size-5 text-brass" />
                </div>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-3 text-text-mid">{p.blurb}</p>
              </li>
            )
          })}
        </ol>

        <Link
          href="/how-it-works"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:text-brass-bright"
        >
          See the full 13-stage breakdown <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-hairline text-text-mid transition-colors hover:border-hairline-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}
