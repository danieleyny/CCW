"use client"

import { useEffect, useRef } from "react"

/**
 * The hero case-file sculpture. Static markup, plus a RESTRAINED pointer tilt so it
 * reads as an object, not a picture. The tilt is transform-only (sets --tilt-x/--tilt-y
 * on .case-sculpture, which CSS turns into rotateX/rotateY), attaches ONLY on fine
 * pointers, is disabled under prefers-reduced-motion, and eases back to rest on leave —
 * event-driven, never a loop. The staggered deal-in entrance and the scroll-out fan are
 * both pure CSS (see marketing-v2.css). Nothing here starts hidden.
 */
export function HeroSculpture() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const sculpt = host.querySelector<HTMLElement>(".case-sculpture")
    if (!sculpt) return

    const MAX = 6 // degrees
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2 || 1)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2 || 1)
      sculpt.style.setProperty("--tilt-x", `${(Math.max(-1, Math.min(1, dx)) * MAX).toFixed(2)}deg`)
      sculpt.style.setProperty("--tilt-y", `${(Math.max(-1, Math.min(1, -dy)) * MAX).toFixed(2)}deg`)
    }
    const reset = () => {
      sculpt.style.setProperty("--tilt-x", "0deg")
      sculpt.style.setProperty("--tilt-y", "0deg")
    }

    host.addEventListener("pointermove", onMove)
    host.addEventListener("pointerleave", reset)
    return () => {
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerleave", reset)
    }
  }, [])

  return (
    <div className="hero-visual" aria-label="Layered client case file preview" ref={ref}>
      <div className="case-sculpture">
        <div className="case-scroll-layer">
          <div className="ribbon ribbon-back" aria-hidden="true" />
          <div className="paper-sheet sheet-next" data-index="05"><span>Next steps</span></div>
          <div className="paper-sheet sheet-requirements" data-index="04"><span>Requirements</span></div>
          <div className="paper-sheet sheet-application" data-index="03"><span>Application</span></div>
          <div className="paper-sheet sheet-documents" data-index="02"><span>Documents</span></div>
          <div className="paper-sheet sheet-eligibility" data-index="01"><span>Eligibility</span></div>
          <article className="case-file">
            <div className="case-top">
              <span>Case file · NYC carry</span>
              <span className="stage-number">Stage 06 / 13</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Case stage progress"
              aria-valuenow={6}
              aria-valuemin={0}
              aria-valuemax={13}
            >
              <div className="progress-fill" />
            </div>
            <div className="next-step">
              <p className="next-label">Your one action this week</p>
              <h2>Confirm your training date</h2>
            </div>
            <div className="case-stat">
              <span>Everything already handled</span>
              <strong>14 of 24 ready</strong>
            </div>
          </article>
          <div className="ribbon-loop" aria-hidden="true" />
          <div className="ribbon ribbon-front" aria-hidden="true" />
          <p className="sculpture-note">A clearer tomorrow from a brighter New York</p>
        </div>
      </div>
    </div>
  )
}
