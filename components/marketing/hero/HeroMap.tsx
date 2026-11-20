"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import styles from "./Hero.module.css"
import { startHeroMap } from "./mapOverlay"
import { FOLDER, MAP_PATH, STOP_LABELS, STOP_POINTS, V2_MAP_PATH, V2_STOP_POINTS } from "./heroMapPath"
import { stopColors } from "./heroPalette"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { usePalette } from "@/components/theme/usePalette"

const MAP_SRC = "/images/marketing/hero-nyc-guided-path-v2.png"
const MAP_WEBP_SRC = "/images/marketing/hero-nyc-guided-path-v2.webp"
const V2_MAP_SRC = "/images/marketing/v2/hero-v2-base.webp"
const MAP_WIDTH = 1448
const MAP_HEIGHT = 1086

export default function HeroMap({ intro = false, mapSrc = MAP_SRC }: { intro?: boolean; mapSrc?: string }) {
  const reduced = usePrefersReducedMotion()
  const palette = usePalette()
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const finaleChipRef = useRef<HTMLDivElement>(null)
  const [chip, setChip] = useState(-1)
  const [stage, setStage] = useState(0)
  const [finale, setFinale] = useState(false)
  const [finaleSide, setFinaleSide] = useState<"right" | "left">("right")
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const canTilt = useRef(false)
  const isV2 = palette.gold === "#D9B25F"
  const activeMapSrc = isV2 ? V2_MAP_SRC : mapSrc
  const routePath = isV2 ? V2_MAP_PATH : MAP_PATH
  const routeStops = isV2 ? V2_STOP_POINTS : STOP_POINTS
  const [finalX, finalY] = routePath[routeStops.at(-1)!]

  useEffect(() => {
    canTilt.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced
    const canvas = canvasRef.current
    if (!canvas) return
    let destroy: (() => void) | undefined
    const start = () => {
      const params = new URLSearchParams(window.location.search)
      const debug = params.has("heroDebug")
      const map = startHeroMap(canvas, {
        reducedMotion: reduced,
        debug,
        debugPath: params.has("debugPath"),
        palette,
        image: imageRef.current ?? undefined,
        onStep: (activeChip, step) => {
          setChip(activeChip)
          // V2 adds the image-backed sixth stage, CASE READY, after the five
          // regular stop chips. The live/colorway routes still cap at five.
          setStage(Math.min(step + 1, STOP_LABELS.length + (palette.gold ? 1 : 0)))
        },
        onFinale: setFinale,
      })
      const image = imageRef.current
      const remeasure = () => map.rebuild()
      image?.addEventListener("load", remeasure)
      void image?.decode?.().then(remeasure).catch(() => undefined)
      void document.fonts?.ready.then(remeasure)
      const originalDestroy = () => {
        image?.removeEventListener("load", remeasure)
        map.destroy()
      }
      destroy = originalDestroy
    }
    let timeout: number | undefined
    let cancelled = false
    const startAfterFonts = () => {
      if (cancelled) return
      timeout = intro && !reduced ? window.setTimeout(start, 1700) : undefined
      if (timeout === undefined) start()
    }
    // Canvas labels use the same loaded mono face as the DOM. Waiting avoids a
    // first-frame fallback label that can persist in a static/reduced frame.
    const ready = document.fonts?.ready ?? Promise.resolve()
    void ready.then(startAfterFonts)
    return () => {
      cancelled = true
      if (timeout !== undefined) window.clearTimeout(timeout)
      destroy?.()
    }
  }, [intro, palette, reduced])

  useEffect(() => {
    const map = mapFrameRef.current
    const finaleChip = finaleChipRef.current
    if (!map || !finaleChip) return

    const updateFinaleSide = () => {
      const mapWidth = map.getBoundingClientRect().width
      const rightEdge = FOLDER.chip[0] * mapWidth + finaleChip.offsetWidth + 12
      setFinaleSide(rightEdge > mapWidth ? "left" : "right")
    }

    updateFinaleSide()
    const observer = new ResizeObserver(updateFinaleSide)
    observer.observe(map)
    observer.observe(finaleChip)
    return () => observer.disconnect()
  }, [])

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canTilt.current || event.pointerType !== "mouse") return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -y * 5, y: x * 6 })
  }

  return (
    <div ref={mapFrameRef} className={styles.mapFrame} data-testid="hero-map" data-hero-stage={stage} onPointerMove={onPointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className={styles.mapTilt} data-finale={finale} data-v2={isV2 || undefined} style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className={styles.mapShadow} aria-hidden="true" />
        <picture className={styles.mapPicture}>
          <source srcSet={isV2 ? V2_MAP_SRC : mapSrc === MAP_SRC ? MAP_WEBP_SRC : mapSrc} type="image/webp" />
          <img
            ref={imageRef}
            className={styles.mapImg}
            src={activeMapSrc}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            alt="An abstract New York City model with a glowing five-stop path leading through organized document stacks to a completed case file."
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div
          className={styles.folderLift}
          aria-hidden="true"
          style={{
            left: `${FOLDER.liftBox.x * 100}%`,
            top: `${FOLDER.liftBox.y * 100}%`,
            width: `${FOLDER.liftBox.w * 100}%`,
            height: `${FOLDER.liftBox.h * 100}%`,
            backgroundImage: `url(${activeMapSrc})`,
            backgroundSize: `${100 / FOLDER.liftBox.w}% ${100 / FOLDER.liftBox.h}%`,
            backgroundPosition: `${(FOLDER.liftBox.x / (1 - FOLDER.liftBox.w)) * 100}% ${(FOLDER.liftBox.y / (1 - FOLDER.liftBox.h)) * 100}%`,
          }}
        />
        <canvas ref={canvasRef} className={styles.mapCanvas} data-testid="hero-map-overlay" aria-hidden="true" />
        {STOP_LABELS.map((label, index) => {
          const [x, y] = routePath[routeStops[index]]
          return (
            <div
              key={label}
              className={styles.chip}
              data-on={chip === index}
              data-stage-label={index + 1}
              style={{ left: `${x * 100}%`, top: `calc(${y * 100}% - 26px)` }}
              aria-hidden="true"
            >
              <span className={styles.chipNum} style={{ background: palette.gold ? "#14254A" : stopColors(palette)[index] }}>
                0{index + 1}
              </span>
              <span className={styles.chipLabel}>{label}</span>
            </div>
          )
        })}
        <div
          ref={finaleChipRef}
          className={styles.finaleChip}
          data-on={finale}
          data-side={finaleSide}
          data-v2={isV2 || undefined}
          data-testid="hero-map-finale"
          style={{
            left: `${(isV2 ? finalX : finaleSide === "left" ? 0.725 : FOLDER.chip[0]) * 100}%`,
            top: `${(isV2 ? finalY : FOLDER.chip[1]) * 100}%`,
          }}
          aria-hidden="true"
        >
          <span className={styles.chipNum} style={{ background: palette.gold ? "#14254A" : palette.warm }}>06</span>
          <span className={styles.chipLabel}>Case ready</span>
          <svg className={styles.finaleCheck} width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
            <path d="M1.5 6.5l3.6 3.4L12.5 2" fill="none" stroke="#1F9A66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
