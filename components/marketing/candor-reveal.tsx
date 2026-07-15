"use client"

import { useEffect, useRef, useState } from "react"

/**
 * V8 — the Candor headline as a "redaction → disclosure" reveal. The key words
 * (Sealed / dismissed / disclosed) each carry a black redaction bar (::after)
 * that wipes away once when the section scrolls into view, then rests — it never
 * loops (this section stays serious). The text is real, selectable, and in the
 * DOM; the bars are decorative. prefers-reduced-motion → words render
 * un-redacted immediately with no bars (see `.candor-word` in globals.css).
 */
export function CandorReveal() {
  const ref = useRef<HTMLHeadingElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold: 0.45 }
    )
    io.observe(el)
    // Safety net: never leave the words permanently behind the bars if the
    // observer misfires — reveal after a few seconds regardless.
    const fallback = setTimeout(() => setRevealed(true), 3500)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  return (
    <h2
      ref={ref}
      data-reveal={revealed}
      className="candor-h2 mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl"
    >
      <span className="candor-word" style={{ "--i": 0 } as React.CSSProperties}>
        Sealed
      </span>{" "}
      and{" "}
      <span className="candor-word" style={{ "--i": 1 } as React.CSSProperties}>
        dismissed
      </span>{" "}
      arrests are still{" "}
      <span className="candor-word" style={{ "--i": 2 } as React.CSSProperties}>
        disclosed
      </span>
      .
    </h2>
  )
}
