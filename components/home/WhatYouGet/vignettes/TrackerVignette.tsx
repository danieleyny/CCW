import type { CSSProperties } from "react"
import styles from "./Tracker.module.css"

function Check() {
  return (
    <svg className={styles.check} viewBox="0 0 10 10" aria-hidden="true">
      <circle cx="5" cy="5" r="5" fill="var(--wyg-accent, #23A26D)" />
      <path d="M2 5.2l2 2 4-4.4" stroke="#FFF" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function TrackerVignette({ running, stage, accent = "#2F8FD0" }: { running: boolean; stage: string; accent?: string }) {
  return (
    <div className={`${styles.stage} ${running ? styles.running : ""}`} style={{ "--stage": stage, "--wyg-accent": accent } as CSSProperties} aria-hidden="true" data-wyg-vignette>
      <div className={styles.head}><span>YOUR CASE</span><span>3 of 5 phases</span></div>
      <div className={styles.bar}><div className={styles.barFill} /></div>
      <div className={styles.list}>
        <div className={`${styles.item} ${styles.in1}`}><Check /><span>Training certificate added</span><em>Mon</em></div>
        <div className={`${styles.item} ${styles.in2}`}><Check /><span>References received · 4 of 4</span><em>Wed</em></div>
        <div className={`${styles.item} ${styles.next} ${styles.in3}`}>
          <i className={styles.ping} /><span><b>Next:</b> book fingerprinting</span><strong className={styles.cta}>Book</strong>
        </div>
      </div>
    </div>
  )
}
