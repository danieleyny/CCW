"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import styles from "./ClosingCta.module.css"
import { SiteFooter } from "../v2/site-footer"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { startClosingDust } from "./closingDust"
import { startClosingPath } from "./closingPath"
import { usePalette } from "@/components/theme/usePalette"

export default function ClosingCta() {
  const reduced = usePrefersReducedMotion()
  const palette = usePalette()
  const pathRef = useRef<HTMLCanvasElement>(null)
  const dustRef = useRef<HTMLCanvasElement>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const pathCanvas = pathRef.current
    const dustCanvas = dustRef.current
    const anchor = anchorRef.current
    const section = sectionRef.current
    if (!pathCanvas || !dustCanvas || !anchor || !section) return

    const mono = '"IBM Plex Mono", monospace'
    const mobile = window.matchMedia("(max-width: 899px)")
    const path = startClosingPath(pathCanvas, anchor, { reducedMotion: reduced, mobile: () => mobile.matches, monoFont: mono, palette, section })
    const dust = startClosingDust(dustCanvas, () => section.offsetHeight, reduced, palette)
    document.fonts?.ready.then(() => path.redraw())
    return () => {
      path.destroy()
      dust.destroy()
      delete anchor.dataset.celebrate
    }
  }, [palette, reduced])

  return (
    <div className={styles.wrap} id="closing">
      <canvas ref={dustRef} className={styles.dust} aria-hidden="true" />
      <section ref={sectionRef} className={styles.closing} data-header="dark" aria-labelledby="closing-title">
        <div className={styles.aurora} aria-hidden="true">
          <span className={styles.auroraGrid} />
          <span className={styles.blobMid} />
          <span className={styles.blobLeft} />
          <span className={styles.blobRight} />
          <span className={styles.auroraLine} />
        </div>
        <canvas ref={pathRef} className={styles.path} aria-hidden="true" />
        <div className={styles.content}>
          <p className={styles.eyebrow}>Start with clarity</p>
          <h2 id="closing-title" className={styles.title}>See where<br />you stand.</h2>
          <p className={styles.lede} data-closing-lede>
            <span className={styles.desktopOnly}>Answer a short set of questions and see whether our document-preparation and case-management service fits your situation.</span>
            <span className={styles.mobileOnly}>Answer a short set of questions and see whether our service fits your situation.</span>
          </p>
        </div>
        <div className={styles.ctaBlock}>
          <p className={styles.ctaLabel}>Your path starts here</p>
          <span ref={anchorRef} className={styles.ctaAnchor}>
            <Link href="/eligibility" className={styles.btnChrome}>
              Check eligibility
              <svg className={styles.arrow} width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </span>
          <p className={styles.ctaSub}>2 minutes · no card required</p>
        </div>
      </section>
      <SiteFooter embedded />
    </div>
  )
}
