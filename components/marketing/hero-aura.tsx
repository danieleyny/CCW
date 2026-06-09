"use client"

import { useEffect, useRef } from "react"

/**
 * Cinematic hero backdrop — a layered, CSS-only composition over the deepened
 * obsidian: a slow aurora/gradient mesh of brass + ice + signal pools, a fine
 * starfield/dust layer for depth, a single periodic light sweep, the signature
 * hairline horizon + film grain + vignette, and a whisper of pointer parallax.
 *
 * GPU-light (transform/opacity only, no rAF render loop — parallax is a throttled
 * transform write). aria-hidden + pointer-events-none. Under reduced-motion every
 * layer freezes into a still, premium composition; parallax is disabled on touch.
 */
export function HeroAura() {
  const rootRef = useRef<HTMLDivElement>(null)
  const farRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const fine = window.matchMedia("(pointer: fine)").matches
    if (reduce || !fine) return

    let raf = 0
    let tx = 0
    let ty = 0

    const apply = () => {
      raf = 0
      if (farRef.current) farRef.current.style.transform = `translate3d(${tx * 8}px, ${ty * 8}px, 0)`
      if (nearRef.current) nearRef.current.style.transform = `translate3d(${tx * -16}px, ${ty * -16}px, 0)`
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      // -0.5..0.5 relative to the hero center
      tx = (e.clientX - r.left) / r.width - 0.5
      ty = (e.clientY - r.top) / r.height - 0.5
      if (!raf) raf = requestAnimationFrame(apply)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="noise pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* warm wash from the top — anchors the composition in brass */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-15%,rgba(201,162,75,0.14),transparent_60%)]" />

      {/* FAR parallax layer: the slow aurora gradient-mesh */}
      <div ref={farRef} className="absolute inset-0 will-change-transform">
        <div className="animate-aurora-a absolute -top-1/3 left-1/2 h-[68rem] w-[68rem] -translate-x-1/2 rounded-full bg-brass/[0.10] blur-[150px]" />
        <div className="animate-aurora-b absolute top-1/4 -right-56 h-[46rem] w-[46rem] rounded-full bg-signal/[0.07] blur-[150px]" />
        <div className="animate-aura-3 absolute -bottom-56 -left-40 h-[48rem] w-[48rem] rounded-full bg-ice/[0.05] blur-[150px]" />
      </div>

      {/* Starfield / floating dust — two tiled radial-gradient layers, slow drift,
          masked so it's densest mid-hero and fades at the edges. CSS-only. */}
      <div
        className="animate-star-drift absolute inset-0 opacity-50 [background-image:radial-gradient(1px_1px_at_20%_30%,rgba(255,255,255,0.7),transparent),radial-gradient(1px_1px_at_75%_60%,rgba(191,216,230,0.6),transparent),radial-gradient(1px_1px_at_45%_85%,rgba(255,255,255,0.5),transparent),radial-gradient(1px_1px_at_85%_20%,rgba(255,255,255,0.45),transparent)] [background-size:240px_240px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />

      {/* NEAR parallax layer: a couple of brighter signal/ice motes for depth */}
      <div ref={nearRef} className="absolute inset-0 will-change-transform">
        <div className="absolute left-[22%] top-[28%] size-1 rounded-full bg-signal/60 blur-[1px]" />
        <div className="absolute right-[26%] top-[44%] size-1 rounded-full bg-ice/60 blur-[1px]" />
        <div className="absolute left-[60%] top-[64%] size-[3px] rounded-full bg-brass/50 blur-[1px]" />
      </div>

      {/* periodic light sweep — whisper-quiet, every ~12s */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-hero-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-ice/[0.06] to-transparent" />
      </div>

      {/* hairline horizon for quiet structure */}
      <div className="absolute inset-x-0 top-[58%] h-px bg-gradient-to-r from-transparent via-brass/15 to-transparent" />

      {/* vignette + fade into the page (uses deepened obsidian) */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_52%,rgba(7,8,11,0.7)_100%)]" />
    </div>
  )
}
