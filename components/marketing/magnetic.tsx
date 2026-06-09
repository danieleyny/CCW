"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

/** Nudges its child toward the cursor on hover (fine-pointer, motion-on only). */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  function onMove(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia("(pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }
  function reset() {
    const el = ref.current
    if (el) el.style.transform = ""
  }

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn("inline-block transition-transform duration-200 ease-out", className)}
    >
      {children}
    </span>
  )
}
