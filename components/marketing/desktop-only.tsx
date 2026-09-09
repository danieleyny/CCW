"use client"

import { useState, useEffect, type ReactNode } from "react"

/**
 * Renders children on the server (so DESKTOP shows them immediately, with no flash),
 * then REMOVES them from the DOM on phones (≤900px) after hydration.
 *
 * Why remove rather than `display:none`: a heavy homepage-only component (the hero film,
 * the 24-document "Count" showcase) that stays in the mobile DOM still has to be torn
 * down and its styles recalculated when the visitor navigates AWAY — which is why nav was
 * slow only from the homepage. Shedding the nodes on mobile keeps the mobile homepage as
 * light as any other page, so navigation is fast. Desktop keeps everything, unchanged.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)")
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return mobile ? null : <>{children}</>
}
