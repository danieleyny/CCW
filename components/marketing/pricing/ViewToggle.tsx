"use client"

import styles from "./PricingSection.module.css"
import type { SceneMode } from "./pricingScene"

type Props = { mode: SceneMode; onChange: (mode: SceneMode) => void; full?: boolean }

export default function ViewToggle({ mode, onChange, full }: Props) {
  const timeline = mode === "timeline"
  return (
    <div className={`${styles.toggle} ${full ? styles.toggleFull : ""}`} role="group" aria-label="Pricing view">
      <span className={styles.togglePill} data-right={timeline} aria-hidden="true">
        <span key={mode} className={styles.toggleFlash} />
      </span>
      <button type="button" className={styles.toggleBtn} aria-pressed={!timeline} data-on={!timeline} onClick={() => onChange("breakdown")}>
        Breakdown
      </button>
      <button type="button" className={styles.toggleBtn} aria-pressed={timeline} data-on={timeline} onClick={() => onChange("timeline")}>
        Timeline
      </button>
    </div>
  )
}
