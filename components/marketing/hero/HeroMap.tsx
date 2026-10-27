"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import styles from "./Hero.module.css"
import { startHeroMap } from "./mapOverlay"
import { MAP_PATH, STOP_LABELS, STOP_POINTS } from "./heroMapPath"
import { STOP_COLORS } from "./heroPalette"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"

const MAP_SRC = "/images/marketing/hero-nyc-guided-path-v2.png"
const MAP_WEBP_SRC = "/images/marketing/hero-nyc-guided-path-v2.webp"
const MAP_WIDTH = 1448
const MAP_HEIGHT = 1086

export default function HeroMap({ intro = false }: { intro?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [chip, setChip] = useState(-1)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const canTilt = useRef(false)

  useEffect(() => {
    canTilt.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced
    const canvas = canvasRef.current
    if (!canvas) return
    let destroy: (() => void) | undefined
    const start = () => {
      const debug = new URLSearchParams(window.location.search).has("heroDebug")
      const map = startHeroMap(canvas, { reducedMotion: reduced, debug, onStep: (activeChip) => setChip(activeChip) })
      destroy = () => map.destroy()
    }
    const timeout = intro && !reduced ? window.setTimeout(start, 1700) : undefined
    if (timeout === undefined) start()
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
      destroy?.()
    }
  }, [intro, reduced])

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canTilt.current || event.pointerType !== "mouse") return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -y * 5, y: x * 6 })
  }

  return (
    <div className={styles.mapFrame} onPointerMove={onPointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className={styles.mapTilt} style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className={styles.mapShadow} aria-hidden="true" />
        <picture className={styles.mapPicture}>
          <source srcSet={MAP_WEBP_SRC} type="image/webp" />
          <img
            className={styles.mapImg}
            src={MAP_SRC}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            alt="An abstract New York City model with a glowing five-stop path leading through organized document stacks to a completed case file."
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <canvas ref={canvasRef} className={styles.mapCanvas} aria-hidden="true" />
        {STOP_LABELS.map((label, index) => {
          const [x, y] = MAP_PATH[STOP_POINTS[index]]
          return (
            <div
              key={label}
              className={styles.chip}
              data-on={chip === index}
              style={{ left: `${x * 100}%`, top: `calc(${y * 100}% - 26px)` }}
              aria-hidden="true"
            >
              <span className={styles.chipNum} style={{ background: STOP_COLORS[index] }}>
                0{index + 1}
              </span>
              <span className={styles.chipLabel}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
