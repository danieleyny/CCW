"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void
    }
  }
}

/**
 * CONCIERGE UX — Calendly's OFFICIAL inline widget (widget.js), so the scheduler
 * autosizes to its content and can never be clipped by a fixed pixel height (or
 * scroll inside a nested box). The min-height is only a pre-load fallback; once
 * widget.js loads, Calendly manages the height. Works on first load and on
 * client-side navigation (re-inits when window.Calendly already exists).
 */
export function CalendlyInline({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const init = () => {
      if (window.Calendly && ref.current) {
        ref.current.innerHTML = ""
        window.Calendly.initInlineWidget({ url, parentElement: ref.current })
      }
    }

    if (window.Calendly) {
      init()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-calendly-widget]")
    if (existing) {
      existing.addEventListener("load", init)
      return () => existing.removeEventListener("load", init)
    }

    const s = document.createElement("script")
    s.src = "https://assets.calendly.com/assets/external/widget.js"
    s.async = true
    s.dataset.calendlyWidget = "1"
    s.addEventListener("load", init)
    document.body.appendChild(s)
    return () => s.removeEventListener("load", init)
  }, [url])

  // Pre-load fallback height (never a fixed height; widget.js sizes it after load).
  return <div ref={ref} className="min-h-[1180px] w-full sm:min-h-[1080px]" />
}
