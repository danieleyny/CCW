"use client"

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react"
import styles from "./PlanningRealities.module.css"
import { startSignalField, type SignalFieldHandle } from "./signalField"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { usePalette } from "@/components/theme/usePalette"
import { HOURS_COPY } from "@/content/training/config"

type Fact = { num: string; unit: string; title: string; value: string; desc: string }

const FACTS: Fact[] = [
  { num: "~6", unit: "months", title: "Planning horizon", value: "~6 mo", desc: "Typical planning horizon from start to decision." },
  { num: "18", unit: "hours", title: "Required training", value: HOURS_COPY.planning, desc: "Required training for a concealed-carry application." },
  { num: "4", unit: "references", title: "Character references", value: "4", desc: "For the standard NYC carry track." },
  { num: "1×", unit: "each adult", title: "Cohabitant statements", value: "1×", desc: "A cohabitant statement for every adult at home." },
  { num: "1", unit: "interview", title: "Investigator interview", value: "1", desc: "Prepare for the investigator’s questions and requests." },
]

const AUTOPLAY_MS = 5000
const pad = (number: number) => String(number).padStart(2, "0")

export default function PlanningRealities() {
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [hold, setHold] = useState(false)
  const [inView, setInView] = useState(false)
  const [userDriven, setUserDriven] = useState(false)
  const reduced = usePrefersReducedMotion()
  const palette = usePalette()
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<SignalFieldHandle | null>(null)
  const activeRef = useRef(0)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const field = startSignalField(canvas, {
      count: FACTS.length,
      reducedMotion: reduced,
      initialIndex: activeRef.current,
      dotColor: palette.ice?.[0] ?? palette.phaseDark[2],
      hotColor: palette.goldText ?? palette.phaseDark[0],
      waveRamp: palette.waveRamp,
    })
    fieldRef.current = field
    return () => {
      field.destroy()
      fieldRef.current = null
    }
  }, [palette, reduced])

  useEffect(() => {
    fieldRef.current?.setActive(active)
  }, [active])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const select = (index: number) => {
    setActive(index)
    setCycle((current) => current + 1)
    setUserDriven(true)
  }
  const advance = () => {
    setActive((current) => (current + 1) % FACTS.length)
    setCycle((current) => current + 1)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = FACTS.length
    let next = -1
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % count
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + count) % count
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = count - 1
    if (next < 0) return
    event.preventDefault()
    select(next)
    buttonRefs.current[next]?.focus()
  }
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHold(false)
  }

  const paused = hold || !inView
  const current = FACTS[active]

  return (
    <section ref={sectionRef} className={styles.section} aria-labelledby="planning-realities-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>The real shape of it</p>
          <h2 id="planning-realities-title" className={styles.title}>What it actually takes.</h2>
        </div>
        <p className={styles.lede}>Clear expectations are part of the service. These are planning facts—not promises about what the NYPD will decide or when it will act.</p>
      </header>

      <div className={styles.panel} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={onBlur}>
        <div className={styles.rail}>
          <p className={`${styles.kicker} ${styles.desktopOnly}`}>Planning realities</p>
          <h3 className={`${styles.railTitle} ${styles.desktopOnly}`}>One case. Five things to plan around.</h3>
          <ul className={styles.list}>
            {FACTS.map((fact, index) => {
              const selected = index === active
              return (
                <li key={fact.title}>
                  <button ref={(element) => { buttonRefs.current[index] = element }} type="button" className={`${styles.row} ${selected ? styles.rowActive : ""}`} aria-pressed={selected} onClick={() => select(index)} onKeyDown={(event) => onKeyDown(event, index)}>
                    <span className={styles.rowIndex}>{pad(index + 1)}</span>
                    <span className={styles.rowTitle}>{fact.title}</span>
                    <span className={styles.rowValue}>{fact.value}</span>
                    {selected && !reduced && <span className={styles.progress} aria-hidden="true"><span key={`${active}-${cycle}`} className={styles.progressFill} style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }} onAnimationEnd={advance} /></span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={styles.stage}>
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <div className={styles.stageTop}>
            <p className={`${styles.kicker} ${styles.mobileOnly}`}>Planning realities</p>
            <span className={styles.counter} aria-hidden="true">{pad(active + 1)} / {pad(FACTS.length)}</span>
          </div>
          <div key={active} className={styles.feature} aria-live={userDriven ? "polite" : "off"}>
            <p className={styles.featureTag}>{current.title}</p>
            <p className={styles.featureFigure}><span className={styles.featureNum}>{current.num}</span><span className={styles.featureUnit}>{current.unit}</span></p>
            <p className={styles.featureDesc}>{current.desc}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
