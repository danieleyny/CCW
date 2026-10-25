import styles from "./Hero.module.css"
import HeroHeadline from "./HeroHeadline"
import HeroMap from "./HeroMap"

function Arrow() {
  return (
    <svg className={styles.arrow} width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
      <path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="7" fill="#E4E8FF" />
      <path d="M4 7.2l2 2 4-4.4" stroke="#3D5BD9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TRUST = ["2-minute check", "No card required", "You submit your own application"]

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <HeroHeadline />
        <p className={styles.lede}>
          We turn NYC’s concealed-carry process into one clear next step at a time, while you stay in control of your own application.
        </p>
        <div className={styles.ctas}>
          <a href="/eligibility" className={styles.btnChrome}>
            <span className={styles.btnLabel}>Check eligibility</span>
            <Arrow />
          </a>
          <a href="/how-it-works" className={styles.textLink}>
            <span className={styles.textLinkLabel}>See the process</span>
            <Arrow />
          </a>
        </div>
        <ul className={styles.trust}>
          {TRUST.map((text) => (
            <li key={text}>
              <Check />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.visual}>
        <HeroMap />
      </div>
    </section>
  )
}
