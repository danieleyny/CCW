"use client"

import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePrefersReducedMotion } from "@/components/marketing/shared/usePrefersReducedMotion"
import ReviewVignette from "./vignettes/ReviewVignette"
import TrackerVignette from "./vignettes/TrackerVignette"
import ApproveVignette from "./vignettes/ApproveVignette"
import styles from "./WhatYouGet.module.css"
import { usePalette } from "@/components/theme/usePalette"
import { useThemeKey } from "@/components/theme/ThemeScope"

type Pillar = {
  id: "review" | "tracker" | "approve"
  kicker: string
  title: string
  body: string
  accent: string
  stage: string
}

const PILLARS: Pillar[] = [
  {
    id: "review",
    kicker: "PROTECTS YOUR FEES",
    title: "Mistakes caught before you file",
    body: "NYPD fees are non-refundable. We check every page first, so a small mismatch doesn’t cost you the application.",
    accent: "#C9533D",
    stage: "linear-gradient(160deg,#FFF6F1 0%,#F7F4F2 100%)",
  },
  {
    id: "tracker",
    kicker: "NO GUESSING",
    title: "Always know your next step",
    body: "See what’s done, what’s next, and what’s due. The process never goes quiet on you.",
    accent: "#2F8FD0",
    stage: "linear-gradient(160deg,#EEF7FD 0%,#F3F4FA 100%)",
  },
  {
    id: "approve",
    kicker: "YOU STAY IN CONTROL",
    title: "Nothing goes out without you",
    body: "You review and approve every page, then submit it yourself. We prepare; you decide.",
    accent: "#6A4FC8",
    stage: "linear-gradient(160deg,#F5F0FD 0%,#F4F3F8 100%)",
  },
]

const VIGNETTES = {
  review: ReviewVignette,
  tracker: TrackerVignette,
  approve: ApproveVignette,
}

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const sync = () => setIsDesktop(mediaQuery.matches)
    sync()
    mediaQuery.addEventListener("change", sync)
    return () => mediaQuery.removeEventListener("change", sync)
  }, [])

  return isDesktop
}

export default function WhatYouGet() {
  const reducedMotion = usePrefersReducedMotion()
  const palette = usePalette()
  const theme = useThemeKey()
  const pillars = PILLARS.map((pillar, index) => theme === "v0" ? pillar : {
    ...pillar,
    accent: theme === "v2" ? "#8A6420" : palette.phase[index + 1] ?? palette.phase[index],
    stage: theme === "v2"
      ? "linear-gradient(160deg, #FFFDF8 0%, #F7F4EC 100%)"
      : `linear-gradient(160deg, color-mix(in srgb, ${palette.phase[index]} 13%, var(--surface, #FFF)) 0%, color-mix(in srgb, ${palette.phase[index + 1] ?? palette.phase[index]} 7%, var(--surface, #FFF)) 100%)`,
  })
  const isDesktop = useDesktopLayout()
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const visibleCards = useRef(new Set<number>())
  const ratios = useRef<number[]>(PILLARS.map(() => 0))
  const animationFrames = useRef<number[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [running, setRunning] = useState<boolean[]>(PILLARS.map(() => false))

  const stopCard = useCallback((index: number) => {
    setRunning((current) => current.map((value, itemIndex) => (itemIndex === index ? false : value)))
  }, [])

  const restartCard = useCallback((index: number) => {
    if (reducedMotion || document.visibilityState === "hidden") return

    stopCard(index)
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        const vignette = cardRefs.current[index]?.querySelector<HTMLElement>("[data-wyg-vignette]")
        // Deliberately force the reset before the class is added again so each
        // little story begins at its first frame when it re-enters view.
        if (vignette) void vignette.offsetWidth
        setRunning((current) => current.map((value, itemIndex) => (itemIndex === index ? true : value)))
      })
      animationFrames.current.push(secondFrame)
    })
    animationFrames.current.push(firstFrame)
  }, [reducedMotion, stopCard])

  useEffect(() => {
    const frames = animationFrames.current
    return () => frames.forEach((frame) => window.cancelAnimationFrame(frame))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    const cards = cardRefs.current.filter((card): card is HTMLElement => card !== null)
    if (!track || cards.length === 0) return

    visibleCards.current.clear()
    ratios.current = PILLARS.map(() => 0)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute("data-card-index"))
          if (Number.isNaN(index)) continue

          ratios.current[index] = entry.isIntersecting ? entry.intersectionRatio : 0
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35

          if (isVisible && !visibleCards.current.has(index)) {
            visibleCards.current.add(index)
            restartCard(index)
          }

          if (!isVisible && visibleCards.current.delete(index)) stopCard(index)
        }

        const largestRatio = Math.max(...ratios.current)
        if (largestRatio >= 0.6) setActiveIndex(ratios.current.indexOf(largestRatio))
      },
      { root: isDesktop ? null : track, threshold: [0.35, 0.6] }
    )

    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [isDesktop, restartCard, stopCard])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setRunning(PILLARS.map(() => false))
        return
      }
      visibleCards.current.forEach((index) => restartCard(index))
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [restartCard])

  const showCard = useCallback((index: number) => {
    cardRefs.current[index]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    })
  }, [reducedMotion])

  const onTrackKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDesktop || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    const direction = event.key === "ArrowRight" ? 1 : -1
    showCard(Math.max(0, Math.min(PILLARS.length - 1, activeIndex + direction)))
  }

  return (
    <section className={styles.section} aria-labelledby="wyg-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>WHAT YOU GET</p>
          <h2 className={styles.heading} id="wyg-title">Less risk. Less guessing.</h2>
        </div>
        <p className={styles.counter} aria-live="polite">{String(activeIndex + 1).padStart(2, "0")} / 03</p>
      </header>

      <div
        ref={trackRef}
        className={styles.track}
        {...(!isDesktop ? {
          role: "region",
          "aria-roledescription": "carousel",
          "aria-label": "What you get",
          tabIndex: 0,
        } : {})}
        onKeyDown={onTrackKeyDown}
      >
        {pillars.map((pillar, index) => {
          const Vignette = VIGNETTES[pillar.id]
          return (
            <article
              key={pillar.id}
              ref={(element) => { cardRefs.current[index] = element }}
              className={styles.card}
              data-card-index={index}
              style={{ "--accent": pillar.accent } as CSSProperties}
              {...(!isDesktop ? {
                role: "group",
                "aria-roledescription": "slide",
                "aria-label": `${index + 1} of ${PILLARS.length}`,
              } : {})}
            >
              <Vignette running={!reducedMotion && running[index]} stage={pillar.stage} accent={pillar.accent} />
              <div className={styles.copy}>
                <p className={styles.kicker}>{pillar.kicker}</p>
                <h3>{pillar.title}</h3>
                <p className={styles.body}>{pillar.body}</p>
              </div>
            </article>
          )
        })}
      </div>

      <div className={styles.pagination} style={{ "--pagination-accent": pillars[activeIndex].accent } as CSSProperties} aria-label="Choose a card">
        {pillars.map((pillar, index) => (
          <button
            key={pillar.id}
            type="button"
            className={styles.pageButton}
            data-active={index === activeIndex}
            aria-label={`Show card ${index + 1} of ${PILLARS.length}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => showCard(index)}
          />
        ))}
      </div>
    </section>
  )
}
