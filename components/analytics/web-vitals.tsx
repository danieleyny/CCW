"use client"

import { useReportWebVitals } from "next/web-vitals"

/**
 * SEO/CWV monitoring — reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) to
 * GA4 as events, so field regressions are visible instead of only discovered in
 * rankings. No-ops without gtag (dev / GA off), so it's safe to always mount;
 * the parent gates it to production alongside <GoogleAnalytics />.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    if (typeof gtag !== "function") return
    gtag("event", metric.name, {
      event_category: "Web Vitals",
      // CLS is unitless (×1000 to keep integer precision); others are ms.
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  })
  return null
}
