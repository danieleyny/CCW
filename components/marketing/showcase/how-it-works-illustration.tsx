"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"

/**
 * V7 — the RETAIL hero visual. Replaces the dense CaseFileShowcase on the first
 * screen with a calm, plain-English "how it works in 3 steps" diagram aimed at a
 * first-time, anxious applicant: NO citations, NO internal codes, NO percentages.
 *
 * Motion is CSS-only (see `.hiw-*` in globals.css): on scroll-into-view the spine
 * draws downward, each step rises/fades in sequence, and the final token flips
 * from a numeral to a checkmark with a soft brass glow. Plays once, then rests.
 * Under prefers-reduced-motion it renders the completed state statically. All
 * decorative motion is aria-hidden; the step text stays readable by AT.
 */
const STEPS = [
  { label: "Tell us about you", sub: "A 2-minute eligibility check" },
  { label: "We build your case", sub: "Every document, gathered & checked" },
  { label: "You file — you're licensed", sub: "You submit; we make sure it's right" },
] as const

export function HowItWorksIllustration() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    const fallback = setTimeout(() => setInView(true), 2000)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-inview={inView}
      className="hiw dark relative mx-auto w-full max-w-sm rounded-2xl border border-hairline bg-surface-1/70 p-6 text-left shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-7"
    >
      <div className="engraved mb-5 text-brass-bright">How it works</div>

      <ol className="relative">
        {/* The connecting spine, aligned to the token centers; draws top→bottom. */}
        <span
          aria-hidden
          className="hiw-spine absolute left-[18px] top-3 bottom-6 w-px origin-top bg-gradient-to-b from-brass/60 to-brass/20"
        />

        {STEPS.map((s, i) => {
          const isLast = i === STEPS.length - 1
          return (
            <li
              key={s.label}
              className="hiw-step relative flex items-start gap-4 pb-6 last:pb-0"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span
                className={
                  isLast
                    ? "hiw-token-final relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-brass bg-surface-1 font-display text-sm font-semibold text-brass-bright"
                    : "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/70 bg-surface-1 font-display text-sm font-semibold text-brass-bright"
                }
                aria-hidden
              >
                {isLast ? (
                  <>
                    <span className="hiw-num">3</span>
                    <Check className="hiw-check absolute size-4" strokeWidth={3} />
                  </>
                ) : (
                  i + 1
                )}
              </span>
              <div className="pt-1">
                <div className="font-display text-base font-semibold text-text-hi">{s.label}</div>
                <div className="mt-0.5 text-sm text-text-mid">{s.sub}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
