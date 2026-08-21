"use client"

import { useEffect } from "react"

/**
 * CONCIERGE UX — client-side navigation preserves scroll, so entering a dashboard
 * landed you mid-page. Reset to the top on entry — but NEVER fight a deep link
 * (e.g. #vault from "the one thing we need from you"), so skip when a hash is set.
 */
export function ScrollToTop() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.location.hash) return
    window.scrollTo({ top: 0 })
  }, [])
  return null
}
