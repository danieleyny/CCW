"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Fade + rise on scroll-into-view (IntersectionObserver). Instant under
 * prefers-reduced-motion. Pass `delay` (ms) to stagger items in a grid.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Intentional: reveal immediately when motion is reduced.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return

    // Already on screen at mount (above the fold) → reveal now.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    io.observe(el)
    // Safety net: never let content stay hidden if the observer never fires
    // (some engines/automation don't fire on programmatic scroll).
    const fallback = setTimeout(() => {
      setShown(true)
      io.disconnect()
    }, 2500)
    return () => {
      io.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  )
}
