"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * V5 — THE COUNT. The homepage centerpiece and its one true "wow": a single
 * enormous "24" in metallic prestige fill, a fan of paper cards that assembles
 * on scroll-into-view behind it, and just FIVE sample requirement chips (the
 * full 24-citation wall lives on /how-it-works, where a motivated reader finds
 * it). Abstract cards — no legible text at rest. Reduced-motion → assembled.
 */
const SAMPLE = [
  "Four notarized references",
  "18-hour safety course",
  "A statement from everyone at home",
  "Passport-style photo",
  "Proof any past record is resolved",
]

// 14 abstract paper cards, deterministically scattered (index-derived so SSR and
// client match). Each settles to a tidy stacked fan when the section enters view.
const CARDS = Array.from({ length: 14 }, (_, i) => {
  const sign = i % 2 === 0 ? 1 : -1
  return {
    // scattered start
    sx: sign * (30 + (i % 5) * 22),
    sy: -40 + ((i * 37) % 120),
    sr: sign * (12 + (i % 4) * 9),
    // settled fan
    fr: (i - 7) * 2.4,
    fy: i * -1.5,
  }
})

export function TheCount() {
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
      { threshold: 0.2 }
    )
    io.observe(el)
    const fallback = setTimeout(() => setInView(true), 2500)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  return (
    <section ref={ref} data-inview={inView} className="the-count section-void overflow-hidden py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        {/* The numeral + assembling fan */}
        <div className="relative flex min-h-[18rem] items-center justify-center sm:min-h-[26rem]">
          <div aria-hidden className="absolute inset-0 flex items-center justify-center">
            {CARDS.map((c, i) => (
              <span
                key={i}
                className="count-card absolute h-40 w-28 rounded-lg border border-hairline bg-surface-1/80 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] sm:h-52 sm:w-36"
                style={
                  {
                    "--sx": `${c.sx}px`,
                    "--sy": `${c.sy}px`,
                    "--sr": `${c.sr}deg`,
                    "--fr": `${c.fr}deg`,
                    "--fy": `${c.fy}px`,
                    transitionDelay: `${i * 35}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <span className="display-numeral text-prestige relative tabular-nums">24</span>
        </div>

        {/* Copy + five chips */}
        <div>
          <SectionEyebrow>Everything you&apos;ll need</SectionEyebrow>
          {/* Copy note: "we TRACK every one" — not "handle". Four references come
              from other people, training from an instructor, dispositions from a
              court. We chase and verify them; we don't produce them. */}
          <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-[1.05]">
            Twenty-four documents stand between you and your license. We track every one.
          </h2>
          <p className="mt-4 max-w-md text-text-mid">
            Miss one and the application bounces. We hold all of them, so you don&apos;t have to.
          </p>

          <ul className="mt-6 space-y-2">
            {SAMPLE.map((label) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-1/60 px-3 py-2.5"
              >
                <Check className="size-4 shrink-0 text-brass" />
                <span className="flex-1 text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/how-it-works"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-signal hover:text-brass-bright"
          >
            See the full list <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
