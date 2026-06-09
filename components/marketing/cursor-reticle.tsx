"use client"

import { useEffect, useRef } from "react"

/**
 * A crosshair that trails the cursor and expands over interactive elements.
 * Fine-pointer only; the default cursor is kept for usability. No-op on touch.
 */
export function CursorReticle() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia("(pointer: fine)").matches) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let tx = x
    let ty = y
    let over = false
    let raf = 0

    function onMove(e: PointerEvent) {
      tx = e.clientX
      ty = e.clientY
      el!.style.opacity = "1"
      const t = e.target as Element | null
      over = !!t?.closest?.("a,button,[role=button],input,select,textarea,summary,label")
    }
    function onLeave() {
      el!.style.opacity = "0"
    }
    function loop() {
      const k = reduce ? 1 : 0.22
      x += (tx - x) * k
      y += (ty - y) * k
      el!.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${over ? 1.9 : 1})`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ opacity: 0 }}
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden transition-[opacity] duration-200 md:block"
    >
      <div className="relative size-6 transition-transform">
        <span className="absolute inset-0 rounded-full border border-signal/70" />
        <span className="absolute left-1/2 top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
        <span className="absolute -top-1 left-1/2 h-1.5 w-px -translate-x-1/2 bg-signal/70" />
        <span className="absolute -bottom-1 left-1/2 h-1.5 w-px -translate-x-1/2 bg-signal/70" />
        <span className="absolute -left-1 top-1/2 h-px w-1.5 -translate-y-1/2 bg-signal/70" />
        <span className="absolute -right-1 top-1/2 h-px w-1.5 -translate-y-1/2 bg-signal/70" />
      </div>
    </div>
  )
}
