"use client"

import type { CSSProperties } from "react"
import styles from "./Hero.module.css"
import HeroHeadline from "./HeroHeadline"
import HeroMap from "./HeroMap"
import { usePlayOncePerLoad } from "../shared/usePlayOncePerLoad"

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
      <circle cx="7" cy="7" r="7" fill="var(--trust-bg, #E4E8FF)" />
      <path d="M4 7.2l2 2 4-4.4" stroke="var(--trust-ink, #3D5BD9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TRUST = ["2-minute check", "No card required", "You submit your own application"]

export default function Hero() {
  const playIntro = usePlayOncePerLoad("hero")

  return (
    <section className={styles.hero} data-intro={playIntro ? "play" : undefined}>
      <div className={styles.copy}>
        <HeroHeadline intro={playIntro} />
        <p className={`${styles.lede} ${styles.introSub}`}>
          We turn NYC’s concealed-carry process into one clear next step at a time, while you stay in control of your own application.
        </p>
        <div className={styles.ctas}>
          <a href="/eligibility" className={`${styles.btnChrome} ${styles.introCta}`}>
            <span className={styles.btnLabel}>Check eligibility</span>
            <Arrow />
          </a>
          <a href="/how-it-works" className={`${styles.textLink} ${styles.introLink}`}>
            <span className={styles.textLinkLabel}>See the process</span>
            <Arrow />
          </a>
        </div>
        <ul className={`${styles.trust} ${styles.introTrust}`}>
          {TRUST.map((text, index) => (
            <li key={text} style={{ "--i": index } as CSSProperties}>
              <Check />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${styles.visual} ${styles.introMap}`} style={{ "--map-src": "url(/images/marketing/hero-nyc-guided-path-v2.png)" } as CSSProperties}>
        <HeroMap intro={playIntro} mapSrc="/images/marketing/hero-nyc-guided-path-v2.png" />
        <span className={styles.introSheen} aria-hidden="true" />
      </div>
    </section>
  )
}
