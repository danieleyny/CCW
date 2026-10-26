import type { CSSProperties } from "react"
import styles from "./Approve.module.css"

export default function ApproveVignette({ running, stage }: { running: boolean; stage: string }) {
  return (
    <div className={`${styles.stage} ${running ? styles.running : ""}`} style={{ "--stage": stage } as CSSProperties} aria-hidden="true" data-wyg-vignette>
      <div className={styles.dialog}>
        <p className={styles.dTitle}>Ready to submit?</p>
        <p className={styles.dSub}>14 pages · all reviewed</p>
        <div className={styles.btns}>
          <span className={styles.ghost}>Not yet</span>
          <span className={styles.primary}>
            <span className={styles.plain}>I approve</span>
            <span className={styles.appr}>Approved by you ✓</span>
          </span>
        </div>
      </div>
      <p className={styles.foot}>YOU SUBMIT IT · UNDER YOUR NAME</p>
      <svg className={styles.cursor} width="18" height="22" viewBox="0 0 18 22">
        <path d="M2 2l13 10-6 1 3.5 6.5-2.6 1.4-3.5-6.6L2 18z" fill="#0B1420" stroke="#FFF" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
