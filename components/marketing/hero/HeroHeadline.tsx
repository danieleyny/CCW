"use client"

import { useEffect, useRef } from "react"
import styles from "./Hero.module.css"
import { startSparkField } from "./sparkField"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"

export default function HeroHeadline() {
  const reduced = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const mobile = window.matchMedia("(max-width: 767px)").matches
    const handle = startSparkField(el, {
      reducedMotion: reduced,
      padX: mobile ? 40 : 56,
      padTop: mobile ? 26 : 34,
      padBottom: mobile ? 14 : 18,
    })
    return () => handle.destroy()
  }, [reduced])

  return (
    <h1 className={styles.title}>
      Complicated by design.
      <br />
      <span className={styles.inkWrap}>
        <canvas ref={canvasRef} className={styles.sparkCanvas} aria-hidden="true" />
        <span className={`${styles.ink} ${styles.inkGlow}`} aria-hidden="true">
          Clear by ours.
        </span>
        <span className={`${styles.ink} ${styles.inkText}`}>Clear by ours.</span>
      </span>
    </h1>
  )
}
