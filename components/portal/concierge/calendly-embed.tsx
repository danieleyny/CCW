"use client"

import { useEffect, useState } from "react"

/**
 * Calendly inline embed as a plain iframe that AUTOSIZES to its content — so the
 * white panel hugs the calendar with no dead space, yet still grows to fit the
 * taller confirmation form without clipping.
 *
 * Calendly emits `calendly.page_height` postMessages to the parent when the
 * embed loads with `embed_domain` + `embed_type=Inline` (the same handshake
 * widget.js uses under the hood). We add those params on the client (embed_domain
 * must match the live host) and set the height to whatever Calendly reports. The
 * initial height is deliberately generous: if the message never arrives we simply
 * keep a no-clip fixed height rather than cutting the calendar off.
 */
export function CalendlyEmbed({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [height, setHeight] = useState(1000)

  useEffect(() => {
    const u = new URL(url)
    u.searchParams.set("embed_domain", window.location.hostname)
    u.searchParams.set("embed_type", "Inline")
    setSrc(u.toString())

    function onMessage(e: MessageEvent) {
      if (typeof e.origin !== "string" || !e.origin.includes("calendly.com")) return
      const data = e.data as { event?: string; payload?: { height?: number | string } }
      if (data?.event === "calendly.page_height") {
        const h = parseInt(String(data.payload?.height ?? ""), 10)
        if (Number.isFinite(h) && h > 0) setHeight(h)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [url])

  // Placeholder before the embed URL is built client-side — avoids loading the
  // non-embed URL once and then reloading with the handshake params.
  if (!src) return <div style={{ height }} className="w-full" aria-hidden />

  return (
    <iframe
      title="Schedule your concierge intro call"
      src={src}
      className="block w-full border-0"
      style={{ height }}
      loading="lazy"
    />
  )
}
