"use client"

import { useEffect } from "react"

/**
 * Deep-link handling for the concierge page. A "Go" link from the "Your
 * application" tab arrives as /portal/concierge#vault (or #review). Native hash
 * scrolling is unreliable across an App-Router route change into an async server
 * component — the target element often isn't in the DOM yet when the browser
 * tries to scroll, so it lands at the top. This runs after hydration (content
 * present), scrolls the section into view, and pulses a blue ring around it so
 * the eye lands where the click meant to go. Also handles a same-page hash change
 * (clicking Go while already on the concierge page).
 */
export function DeepLinkHighlight() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const flash = () => {
      const id = window.location.hash.slice(1)
      if (!id) return
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      // Restart the animation if it's already been applied.
      el.classList.remove("deep-link-flash")
      void el.offsetWidth // force reflow
      el.classList.add("deep-link-flash")
      const clear = () => el.classList.remove("deep-link-flash")
      el.addEventListener("animationend", clear, { once: true })
    }

    // A short delay lets the streamed server content settle before we scroll.
    const t = window.setTimeout(flash, 150)
    window.addEventListener("hashchange", flash)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("hashchange", flash)
    }
  }, [])

  return null
}
