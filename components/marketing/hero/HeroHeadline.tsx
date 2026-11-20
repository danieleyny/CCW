"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import styles from "./Hero.module.css"
import { startSparkField } from "./sparkField"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { usePalette } from "@/components/theme/usePalette"

export default function HeroHeadline({ intro = false }: { intro?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const palette = usePalette()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const mobile = window.matchMedia("(max-width: 767px)").matches
    let destroy: (() => void) | undefined
    const start = () => {
      const handle = startSparkField(el, {
        reducedMotion: reduced,
        padX: mobile ? 40 : 56,
        padTop: mobile ? 26 : 34,
        padBottom: mobile ? 14 : 18,
        palette,
      })
      destroy = () => handle.destroy()
    }
    const timeout = intro && !reduced ? window.setTimeout(start, 1600) : undefined
    if (timeout === undefined) start()
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
      destroy?.()
    }
  }, [intro, palette, reduced])

  return (
    <h1 className={styles.title}>
      <span className={styles.line1}>
        {['Complicated', 'by', 'design.'].map((word, index) => (
          <span key={word}>
            {index > 0 ? " " : null}
            <span className={styles.word}>
              <span style={{ "--i": index } as CSSProperties}>{word}</span>
            </span>
          </span>
        ))}
      </span>
      <br />
      <span className={`${styles.inkWrap} ${styles.line2}`}>
        <canvas ref={canvasRef} className={styles.sparkCanvas} aria-hidden="true" />
        <span className={`${styles.ink} ${styles.inkGlow}`} aria-hidden="true">
          Clear by ours.
        </span>
        <span className={`${styles.ink} ${styles.inkText}`}>Clear by ours.</span>
      </span>
    </h1>
  )
}
