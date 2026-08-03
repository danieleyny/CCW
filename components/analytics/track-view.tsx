"use client"

import { useEffect } from "react"
import { trackEvent, type ConversionEvent } from "@/lib/analytics"

/**
 * Fires a single conversion event on mount — a tiny client island so a static
 * server page (e.g. /pricing) can still record a "viewed" conversion without
 * becoming a Client Component itself. No-ops off production (see lib/analytics).
 */
export function TrackView({ event, params }: { event: ConversionEvent; params?: Record<string, unknown> }) {
  useEffect(() => {
    trackEvent(event, params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])
  return null
}
