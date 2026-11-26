"use client"

import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import {
  analyticsPageGroup,
  type AnalyticsBrand,
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

function PageViews({ brand, measurementId }: { brand: AnalyticsBrand; measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window.gtag !== "function" || !shouldTrackPath(pathname)) return
    const location = analyticsLocation(new URL(window.location.href))
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: location,
      page_title: document.title,
      brand,
      page_group: analyticsPageGroup(pathname),
      send_to: measurementId,
    })
  }, [brand, measurementId, pathname, searchParams])

  return null
}

export function GoogleAnalytics({
  brand,
  measurementId,
}: {
  brand: AnalyticsBrand
  measurementId: string
}) {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (
      initialized.current ||
      !measurementId ||
      !shouldLoadAnalytics(window.location.hostname, pathname, brand)
    ) return

    initialized.current = true
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
    window.gtag("js", new Date())
    window.gtag("config", measurementId, {
      send_page_view: false,
      brand,
      // Firearm licensing is a sensitive category. Collection is for internal
      // product/marketing analysis, not personalized advertising audiences.
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // A return from hosted Checkout must continue the original session rather
      // than showing up as new "checkout.stripe.com / referral" traffic.
      ignore_referrer: isStripeReferrer(document.referrer),
    })
    setEnabled(true)
  }, [brand, measurementId, pathname])

  if (!enabled) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <PageViews brand={brand} measurementId={measurementId} />
      </Suspense>
    </>
  )
}
