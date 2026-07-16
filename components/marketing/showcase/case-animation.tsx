"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * V8 — the animated hero product card. A self-advancing 5-phase story
 * (Eligibility → Train → Assemble → File → Licensed) that shows the whole
 * journey without a word of jargon. Motion is CSS (globals.css `ca-*` / `train-*`
 * / `lic-*`) plus light timers — no requestAnimationFrame render loop.
 *
 * Respectful + accessible:
 *  - prefers-reduced-motion → NO auto-advance; render one composed static state
 *    (the File "24 / 24 complete" state, all timeline nodes lit).
 *  - Auto-advance pauses when the tab is hidden, the card is offscreen, or a
 *    reader is hovering/focusing it.
 *  - The whole card is aria-hidden decoration with a concise sr-only summary;
 *    the hero's real H1/sub/CTA remain accessible outside it.
 */
const ADVANCE_MS = 4200
const FILE_PHASE = 3

const META = [
  { n: "01", name: "Eligibility" },
  { n: "02", name: "Train" },
  { n: "03", name: "Your case" },
  { n: "04", name: "Ready to file" },
  { n: "05", name: "Licensed" },
]
const TIMELINE = ["Enroll", "Train", "Assemble", "File", "Licensed"]

export function CaseAnimation() {
  const [phase, setPhase] = useState(0)
  const [reduced, setReduced] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const hoverRef = useRef(false)
  const offRef = useRef(false)
  const hidRef = useRef(false)
  const pausedRef = useRef(false)
  // Mirrored into state as well: the ref drives the advance timer (no stale
  // closure), the state drives `data-paused` so the progress bar can pause too.
  const [paused, setPaused] = useState(false)
  const recompute = () => {
    const next = hoverRef.current || offRef.current || hidRef.current
    pausedRef.current = next
    setPaused(next)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase(FILE_PHASE)
      return
    }
    const id = setInterval(() => {
      if (!pausedRef.current) setPhase((p) => (p + 1) % META.length)
    }, ADVANCE_MS)
    return () => clearInterval(id)
  }, [reduced])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        offRef.current = !e.isIntersecting
        recompute()
      },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => {
      hidRef.current = document.hidden
      recompute()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  const litCount = reduced ? META.length : phase + 1
  const meta = META[phase]

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-paused={paused}
      onPointerEnter={() => {
        hoverRef.current = true
        recompute()
      }}
      onPointerLeave={() => {
        hoverRef.current = false
        recompute()
      }}
      onFocusCapture={() => {
        hoverRef.current = true
        recompute()
      }}
      onBlurCapture={() => {
        hoverRef.current = false
        recompute()
      }}
      className="relative mx-auto w-full max-w-[440px]"
    >
      {/* soft brass/ice glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 20%, var(--brass-glow), transparent 70%), radial-gradient(50% 50% at 20% 90%, var(--ice-dim), transparent 70%)",
        }}
      />

      <div className="glass-premium overflow-hidden rounded-2xl border border-hairline p-5 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.9)]">
        {/* top: phase progress tracks + label chip. The active track fills over
            the phase duration so it's obvious the card is advancing (and how
            long is left); it pauses whenever the advance timer does. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-1.5">
            {META.map((m, i) => (
              <span
                key={m.n}
                className={cn(
                  "h-1 flex-1 overflow-hidden rounded-full bg-hairline-strong",
                  i === phase && "bg-brass/20"
                )}
              >
                {i < phase && <span className="block h-full w-full bg-brass" />}
                {i === phase &&
                  (reduced ? (
                    <span className="block h-full w-full bg-brass" />
                  ) : (
                    <span
                      key={phase}
                      className="ca-progress block h-full w-full bg-brass"
                      style={{ "--dur": `${ADVANCE_MS}ms` } as React.CSSProperties}
                    />
                  ))}
              </span>
            ))}
          </div>
          <span className="rounded-full border border-hairline bg-surface-1/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-brass-bright">
            Step {meta.n} · {meta.name}
          </span>
        </div>

        {/* body: swaps per phase (keyed so inner animations restart on entry) */}
        <div key={reduced ? "static" : phase} className="ca-body mt-4 min-h-[264px]">
          {phase === 0 && <Eligibility />}
          {phase === 1 && <Train />}
          {phase === 2 && <Assemble />}
          {phase === 3 && <FileReady />}
          {phase === 4 && <Licensed />}
        </div>

        {/* bottom: cumulative timeline */}
        <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
          {TIMELINE.map((label, i) => {
            const lit = i < litCount
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "size-2.5 rounded-full transition-colors duration-500",
                    lit ? "bg-brass shadow-[0_0_8px_var(--brass-glow)]" : "bg-hairline-strong"
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-medium tracking-wide transition-colors duration-500",
                    lit ? "text-text-mid" : "text-text-low/60"
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <span className="sr-only">
        A preview of how Gun License NYC moves a case from eligibility through training, document
        assembly, filing, and licensure.
      </span>
    </div>
  )
}

/* ── Phase 1 — Eligibility ─────────────────────────────────────────────── */
function Eligibility() {
  const CRIT = ["Lives in New York City", "21 years or older", "No disqualifying record"]
  return (
    <div>
      <ul className="ca-stagger space-y-2.5">
        {CRIT.map((c, i) => (
          <li
            key={c}
            style={{ "--i": i } as React.CSSProperties}
            className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-1/60 px-3 py-2.5"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-ok/15 text-ok">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm font-medium text-text-hi">{c}</span>
          </li>
        ))}
      </ul>
      <div
        style={{ "--i": 3 } as React.CSSProperties}
        className="ca-stagger-item mt-4 inline-flex items-center gap-2 rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-sm font-semibold text-brass-bright"
      >
        <Check className="size-4" strokeWidth={3} />
        You may qualify — let&apos;s begin
      </div>
    </div>
  )
}

/* ── Phase 2 — Train (literal, stylized range scene) ───────────────────── */
function Train() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1/50">
        <TrainScene />
      </div>
      <p className="mt-3 text-sm text-text-mid">
        16 classroom hours + live fire — we track your certificate so it&apos;s still valid the day
        you file.
      </p>
    </div>
  )
}

function TrainScene() {
  return (
    <svg viewBox="0 0 320 180" className="w-full" role="img" aria-label="Firearms safety course at an indoor range">
      {/* lane / booth edge */}
      <rect x="0" y="0" width="24" height="180" fill="var(--surface-3)" opacity="0.7" />
      <rect x="24" y="0" width="2" height="180" fill="var(--hairline-strong)" />
      {/* floor line */}
      <rect x="0" y="150" width="320" height="2" fill="var(--hairline)" />

      {/* downrange paper target */}
      <g transform="translate(250,78)">
        <circle r="26" fill="none" stroke="var(--hairline-strong)" strokeWidth="1.5" />
        <circle r="17" fill="none" stroke="var(--hairline-strong)" strokeWidth="1.5" />
        <circle r="8" fill="none" stroke="var(--hairline-strong)" strokeWidth="1.5" />
        <circle r="1.6" fill="var(--text-low)" />
        {/* 3 shots group tightly near center, staggered */}
        <circle className="train-shot" style={{ "--i": 0 } as React.CSSProperties} cx="-2" cy="-3" r="2.4" fill="var(--signal)" />
        <circle className="train-shot" style={{ "--i": 1 } as React.CSSProperties} cx="3" cy="1" r="2.4" fill="var(--signal)" />
        <circle className="train-shot" style={{ "--i": 2 } as React.CSSProperties} cx="-1" cy="4" r="2.4" fill="var(--signal)" />
      </g>

      {/* shooter, seen from behind, in a stance */}
      <g fill="var(--surface-3)">
        {/* head + ear protection */}
        <circle cx="80" cy="70" r="15" />
        <ellipse cx="66" cy="70" rx="4.5" ry="7" fill="var(--text-low)" />
        <ellipse cx="94" cy="70" rx="4.5" ry="7" fill="var(--text-low)" />
        {/* eye-pro temple hint */}
        <rect x="92" y="66" width="8" height="2" rx="1" fill="var(--ice)" opacity="0.7" />
        {/* torso */}
        <path d="M60 96 Q80 86 100 96 L104 150 L56 150 Z" />
        {/* extended arms toward the pistol */}
        <path d="M96 100 L150 92 L150 100 L98 112 Z" />
      </g>
      {/* implied pistol silhouette (minimal — the ceiling) */}
      <g fill="var(--text-hi)" opacity="0.85">
        <rect x="150" y="88" width="20" height="6" rx="1.5" />
        <rect x="152" y="94" width="6" height="9" rx="1.5" />
      </g>
      {/* muzzle flash */}
      <g className="train-flash" transform="translate(172,91)">
        <path d="M0 0 L10 -4 L4 0 L10 4 Z" fill="var(--brass-bright)" />
        <circle r="3" fill="var(--brass)" />
      </g>
    </svg>
  )
}

/* ── Phase 3 — Assemble ────────────────────────────────────────────────── */
function Assemble() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let cur = 0
    const id = setInterval(() => {
      cur += 1
      setN(cur)
      if (cur >= 17) clearInterval(id)
    }, 68)
    return () => clearInterval(id)
  }, [])

  const ITEMS = [
    "Character references — notarized",
    "Cohabitant affidavits collected",
    "Safety course verified",
    "Disclosures explained clearly",
  ]
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="engraved text-text-low">Requirements ready</span>
        <span className="font-display text-2xl font-bold tabular-nums text-brass-bright">
          {n} <span className="text-base text-text-mid">/ 24</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="asm-bar-fill h-full rounded-full bg-brass" />
      </div>
      <ul className="ca-stagger mt-4 space-y-2">
        {ITEMS.map((it, i) => (
          <li
            key={it}
            style={{ "--i": i } as React.CSSProperties}
            className="flex items-center gap-2.5 text-sm text-text-hi"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-ok/15 text-ok">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Phase 4 — File (also the reduced-motion static composition) ───────── */
function FileReady() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="ca-pop flex size-16 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass-bright">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <div className="mt-4 font-display text-2xl font-bold tabular-nums text-text-hi">
        24 / 24 complete
      </div>
      <p className="mt-2 max-w-xs text-sm text-text-mid">
        Assembled in the order they read it. You review, you submit — that&apos;s the law.
      </p>
    </div>
  )
}

/* ── Phase 5 — Licensed (family payoff) ────────────────────────────────── */
function Licensed() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1/50">
        <LicensedScene />
      </div>
      <div className="mt-3 text-center">
        <div className="font-display text-lg font-bold text-text-hi">
          Licensed — and home to what matters
        </div>
        <p className="mt-1 text-sm text-text-mid">
          The whole process, handled. Now you protect the people you love.
        </p>
      </div>
    </div>
  )
}

function LicensedScene() {
  return (
    <svg viewBox="0 0 320 170" className="w-full" role="img" aria-label="A family at home, now licensed">
      <defs>
        <radialGradient id="lic-glow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="170" fill="url(#lic-glow)" />

      {/* home rooflines behind */}
      <g fill="var(--surface-3)" opacity="0.8">
        <path d="M30 150 L30 108 L70 82 L110 108 L110 150 Z" />
        <path d="M210 150 L210 112 L250 88 L290 112 L290 150 Z" />
      </g>
      <rect x="0" y="150" width="320" height="2" fill="var(--hairline)" />

      {/* license badge popping in above */}
      <g className="lic-badge" transform="translate(160,34)">
        <path
          d="M0 -16 L14 -10 L14 4 Q14 16 0 22 Q-14 16 -14 4 L-14 -10 Z"
          fill="var(--brass)"
        />
        <path d="M-6 2 L-1 7 L7 -4" fill="none" stroke="var(--bg)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* family silhouettes rise in */}
      <g fill="var(--surface-3)">
        <g className="lic-fig" style={{ "--i": 0 } as React.CSSProperties}>
          <circle cx="128" cy="96" r="12" />
          <path d="M112 150 Q112 116 128 114 Q144 116 144 150 Z" />
        </g>
        <g className="lic-fig" style={{ "--i": 1 } as React.CSSProperties}>
          <circle cx="192" cy="96" r="12" />
          <path d="M176 150 Q176 116 192 114 Q208 116 208 150 Z" />
        </g>
        <g className="lic-fig" style={{ "--i": 2 } as React.CSSProperties}>
          <circle cx="160" cy="112" r="9" />
          <path d="M148 150 Q148 126 160 124 Q172 126 172 150 Z" />
        </g>
      </g>
    </svg>
  )
}
