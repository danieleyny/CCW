"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

/** Wraps a card with a pointer-tracked brass glow that follows the cursor. */
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.PointerEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - r.left}px`)
    el.style.setProperty("--my", `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={cn("group/spot relative h-full overflow-hidden rounded-lg", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(201,162,75,0.12), transparent 70%)",
        }}
      />
      {children}
    </div>
  )
}
