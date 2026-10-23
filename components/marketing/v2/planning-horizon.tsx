"use client"

import { useRef, useState } from "react"
import type { CSSProperties, UIEvent } from "react"
import styles from "./planning-horizon.module.css"

const realities = [
  ["~6", "months", "Typical planning horizon from start to decision."],
  ["18", "hours", "Required training for a concealed-carry application."],
  ["4", "references", "For the standard NYC carry track."],
  ["1×", "each adult", "A cohabitant statement for every adult at home."],
  ["1", "interview", "Prepare for the investigator’s questions and requests."],
] as const

/**
 * A responsive, swipeable set of published planning facts. The background light
 * is driven by the user's actual scroll position: it is intentionally still when
 * the deck is still, then crosses the board with each swipe.
 */
export function PlanningHorizon() {
  const boardRef = useRef<HTMLDivElement>(null)
  const [activeFact, setActiveFact] = useState(0)

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const deck = event.currentTarget
    const maxScroll = deck.scrollWidth - deck.clientWidth
    const progress = maxScroll > 0 ? deck.scrollLeft / maxScroll : 0
    boardRef.current?.style.setProperty("--swipe-progress", progress.toFixed(3))
    setActiveFact(Math.min(realities.length - 1, Math.max(0, Math.round(progress * (realities.length - 1)))) )
  }

  return (
    <div className={styles.board} ref={boardRef} style={{ "--swipe-progress": ".5" } as CSSProperties}>
      <div className={styles.lightField} aria-hidden="true" />
      <div className={styles.header}>
        <div>
          <p>Planning realities</p>
          <h3>One case. Five things to plan around.</h3>
        </div>
        <div className={styles.swipeStatus} aria-live="polite">
          <span>{String(activeFact + 1).padStart(2, "0")} / 05</span>
          <b>Swipe</b>
        </div>
      </div>
      <div className={styles.facts} onScroll={handleScroll}>
        {realities.map(([value, label, detail], index) => (
          <article className={styles.fact} key={label}>
            <span>0{index + 1}</span>
            <strong>{value}</strong>
            <b>{label}</b>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
