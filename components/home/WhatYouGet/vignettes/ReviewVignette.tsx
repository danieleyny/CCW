import type { CSSProperties } from "react"
import styles from "./Review.module.css"

export default function ReviewVignette({ running, stage }: { running: boolean; stage: string }) {
  return (
    <div className={`${styles.stage} ${running ? styles.running : ""}`} style={{ "--stage": stage } as CSSProperties} aria-hidden="true" data-wyg-vignette>
      <div className={styles.formWrap}>
        <div className={styles.form}>
          <div className={styles.row}><span>Training</span><b>16 + 2 hrs</b></div>
          <div className={`${styles.row} ${styles.rowFlag}`}>
            <span>At address since</span>
            <span className={styles.swap}>
              <b className={styles.bad}><i className={styles.chipBad}>Doesn’t match</i>06/2019</b>
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
