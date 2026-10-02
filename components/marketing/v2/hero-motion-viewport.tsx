"use client"

import { useEffect, useRef } from "react"
import type { ReactNode } from "react"

type HeroMotionViewportProps = {
  children: ReactNode
}

/**
 * Pauses the finite hero story whenever it leaves the viewport. The artwork
 * itself is server-rendered and remains complete without JavaScript; this
 * client boundary controls only the replaying motion layer.
 */
export function HeroMotionViewport({ children }: HeroMotionViewportProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let isVisible = false

    const syncMotionPreference = () => {
      root.dataset.motion = reducedMotion.matches
        ? "reduced"
        : isVisible
          ? "running"
          : "paused"
    }

    syncMotionPreference()

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = Boolean(entry?.isIntersecting)
        syncMotionPreference()
      },
      { threshold: 0.2 },
    )

    observer.observe(root)
    reducedMotion.addEventListener("change", syncMotionPreference)

    return () => {
      observer.disconnect()
      reducedMotion.removeEventListener("change", syncMotionPreference)
    }
  }, [])

  return (
    <div ref={rootRef} className="hero-guided-path" data-motion="paused">
      {children}
    </div>
  )
}
