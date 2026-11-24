"use client"

import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import {
  GA_MEASUREMENT_ID,
  analyticsLocation,
  isStripeReferrer,
  shouldLoadAnalytics,
  shouldTrackPath,
} from "@/lib/analytics-config"

/**
 * Google Analytics 4 (gtag.js). A raw gtag snippet only fires one page_view on
 * the initial load; in this App-Router SPA, internal navigations (home →
 * pricing → checklist) wouldn't register. So we disable the automatic initial
 * page_view (`send_page_view: false`) and fire one ourselves on every route
 * change — including the first — for accurate viewership.
 *
 * Collection is additionally gated in the browser to the canonical hostname.
 * Vercel marks the separate redesign-preview project as "production" too, so
 * VERCEL_ENV alone is not a sufficient guard.
 */
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (command: string, ...args: unknown[]) => void
  }
}

function PageViews() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window.gtag !== "function" || !shouldTrackPath(pathname)) return
    const location = analyticsLocation(new URL(window.location.href))
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: location,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}

export function GoogleAnalytics() {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !shouldLoadAnalytics(window.location.hostname, pathname)) return

    initialized.current = true
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
    window.gtag("js", new Date())
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      // A return from hosted Checkout must continue the original session rather
      // than showing up as new "checkout.stripe.com / referral" traffic.
      ignore_referrer: isStripeReferrer(document.referrer),
    })
    setEnabled(true)
  }, [pathname])

  if (!enabled) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  )
}
