import type { CSSProperties } from "react"
import styles from "./Review.module.css"
import { HOURS_COPY } from "@/content/training/config"

export default function ReviewVignette({ running, stage, accent = "#2F8FD0" }: { running: boolean; stage: string; accent?: string }) {
  return (
    <div className={`${styles.stage} ${running ? styles.running : ""}`} style={{ "--stage": stage, "--wyg-accent": accent } as CSSProperties} aria-hidden="true" data-wyg-vignette>
      <div className={styles.formWrap}>
        <div className={styles.form}>
          <div className={styles.row}><span>Training</span><b>{HOURS_COPY.whatYouGet}</b></div>
          <div className={`${styles.row} ${styles.rowFlag}`}>
            <span>At address since</span>
            <span className={styles.swap}>
              <b className={styles.bad}><i className={styles.chipBad}>Mismatch</i>06/2019</b>
              <b className={styles.good}><i className={styles.chipGood}>Fixed</i>06/2018</b>
            </span>
          </div>
          <div className={styles.row}><span>References</span><b>4 of 4</b></div>
          <div className={styles.row}><span>Disclosures</span><b>Complete</b></div>
        </div>
        <span className={styles.lens}><span className={styles.lensGlass} /><span className={styles.lensHandle} /></span>
      </div>
    </div>
  )
}
