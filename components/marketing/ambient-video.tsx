"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * V7 — reusable ambient background video. Decorative only (aria-hidden), it fills
 * its positioned parent (absolute inset-0, object-cover) so there is ZERO layout
 * shift and the poster shows instantly.
 *
 * Respectful by default:
 *  - prefers-reduced-motion OR Save-Data → render the poster IMAGE only; no video
 *    bytes are ever fetched.
 *  - Otherwise the <video> uses preload="none" (poster only) until it scrolls near
 *    the viewport, then plays; it pauses when scrolled offscreen to save battery.
 * Never used in the hero — the hero keeps its aurora so LCP is protected.
 */
export function AmbientVideo({
  webm,
  mp4,
  poster,
  className,
}: {
  webm: string
  mp4: string
  poster: string
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Start in the "static poster" state so nothing autoplays before we've checked
  // the user's motion / data preferences (also SSR-safe).
  const [staticOnly, setStaticOnly] = useState(true)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    // Client-only: motion + data-saver prefs aren't known until after mount.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaticOnly(reduce || conn?.saveData === true)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "200px",
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || staticOnly) return
    if (inView) v.play().catch(() => {})
    else v.pause()
  }, [inView, staticOnly])

  return (
    <div ref={wrapRef} aria-hidden className={cn("absolute inset-0", className)}>
      {staticOnly ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          className="h-full w-full object-cover"
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}
    </div>
  )
}
