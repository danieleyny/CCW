"use client"

import { useEffect, useRef, useState, type FocusEvent } from "react"
import styles from "./PhasesSection.module.css"
import { HOLD_AFTER_PICK_MS, LOOP_MS, PHASES } from "./phasesData"
import { startPhaseIllustration, type IllustrationHandle } from "./illustrationEngine"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"

export default function PhasesSection() {
  const reduced = usePrefersReducedMotion()
  const [active, setActive] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useRef(false)
  const pointerInside = useRef(false)
  const autoplayHeld = useRef(false)
  const dCanvas = useRef<(HTMLCanvasElement | null)[]>([])
  const mCanvas = useRef<(HTMLCanvasElement | null)[]>([])
  const handles = useRef<IllustrationHandle[][]>([])

  useEffect(() => {
    const list = PHASES.map((p, i) => {
      const hs: IllustrationHandle[] = []
      for (const el of [dCanvas.current[i], mCanvas.current[i]]) {
        if (el) hs.push(startPhaseIllustration(el, i, p.color, { reducedMotion: reduced, initiallyActive: i === 0 }))
      }
      return hs
    })
    handles.current = list
    return () => list.flat().forEach((handle) => handle.destroy())
  }, [reduced])

  useEffect(() => {
    handles.current.forEach((hs, i) => hs.forEach((handle) => handle.setActive(i === active)))
  }, [active])

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting
    }, { threshold: 0.3 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      if (!inView.current || pointerInside.current || autoplayHeld.current) return
      setActive((current) => (current + 1) % PHASES.length)
    }, LOOP_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  const select = (index: number, hold = false) => {
    if (hold) {
      autoplayHeld.current = true
      window.setTimeout(() => { autoplayHeld.current = false }, HOLD_AFTER_PICK_MS)
    }
    setActive(index)
  }

  const groupHandlers = {
    onMouseEnter: () => { pointerInside.current = true },
    onMouseLeave: () => { pointerInside.current = false },
    onFocus: () => { pointerInside.current = true },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) pointerInside.current = false
    },
  }

  return (
    <section ref={sectionRef} className={styles.section} data-reduced={reduced} id="process" aria-labelledby="phases-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>A controlled process</p>
          <h2 id="phases-title" className={styles.title}>One clear path.<br />Five phases.</h2>
        </div>
        <p className={styles.lede}>The full journey is long. Your interface is not. At every stage, you see what is yours, what is being prepared, and what comes next.</p>
      </header>

      <ol className={styles.columns} {...groupHandlers}>
        {PHASES.map((phase, index) => {
          const on = index === active
          return (
            <li key={phase.num} className={styles.colItem} data-on={on} style={{ ["--c" as string]: phase.color }}>
              <button type="button" className={styles.col} data-on={on} data-past={index < active} aria-pressed={on} aria-label={`Phase ${phase.num}, ${phase.title}`} onMouseEnter={() => select(index)} onFocus={() => select(index)} onClick={() => select(index, true)}>
                <span className={styles.colNum}>{phase.num}</span>
                <span className={styles.colRule} aria-hidden="true" />
                <canvas ref={(element) => { dCanvas.current[index] = element }} className={styles.colCanvas} aria-hidden="true" />
                <span className={styles.colTitle} aria-hidden="true">{phase.title}</span>
                <span className={styles.colOpen}><span className={styles.colOpenTitle}>{phase.title}</span><span className={styles.colOpenDesc}>{phase.desc}</span></span>
              </button>
            </li>
          )
        })}
      </ol>

      <ol className={styles.accordion} {...groupHandlers}>
        {PHASES.map((phase, index) => {
          const on = index === active
          return (
            <li key={phase.num} style={{ ["--c" as string]: phase.color }}>
              <button type="button" className={styles.row} data-on={on} data-past={index < active} aria-expanded={on} aria-controls={`phase-panel-${index}`} aria-label={`Phase ${phase.num}, ${phase.title}`} onClick={() => select(index, true)}>
                <span className={styles.rowHead}><span className={styles.rowNum}>{phase.num}</span><span className={styles.rowTitle}>{phase.title}</span></span>
                <span className={styles.rowBody} id={`phase-panel-${index}`}>
                  <span className={styles.rowInner}>
                    <span className={styles.rowCanvasWrap}><canvas ref={(element) => { mCanvas.current[index] = element }} className={styles.rowCanvas} aria-hidden="true" /></span>
                    <span className={styles.rowDesc}>{phase.desc}</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <p className={styles.foot}><strong>Thirteen stages behind the scenes.</strong> Five phases in front of you. Complexity stays in the system instead of in your day.</p>
    </section>
  )
}
