"use client"

import { useEffect, useState } from "react"
import BrandLogo from "@/components/brand/BrandLogo"

/** Plays the mark draw-in once per browser session, never during SSR. */
export function HeaderBrand({ size = "md", className }: { size?: "md" | "sm"; className?: string }) {
  const [intro, setIntro] = useState(false)

  useEffect(() => {
    let frame: number | undefined
    try {
      if (!window.sessionStorage.getItem("glnyc_logo_intro")) {
        window.sessionStorage.setItem("glnyc_logo_intro", "1")
        // Defer one frame so SSR and the first client paint remain fully visible.
        frame = window.requestAnimationFrame(() => setIntro(true))
      }
    } catch {
      // Storage may be disabled. The fully visible static mark is the safe fallback.
    }
    return () => { if (frame !== undefined) window.cancelAnimationFrame(frame) }
  }, [])

  return <BrandLogo tone="ink" size={size} intro={intro} responsiveHeader className={className} />
}
