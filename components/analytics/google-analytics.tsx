"use client"

import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

/**
 * Google Analytics 4 (gtag.js). A raw gtag snippet only fires one page_view on
 * the initial load; in this App-Router SPA, internal navigations (home →
 * pricing → checklist) wouldn't register. So we disable the automatic initial
 * page_view (`send_page_view: false`) and fire one ourselves on every route
 * change — including the first — for accurate viewership.
 *
 * Rendered by the root layout ONLY on the production deployment (see
 * app/layout.tsx), so localhost and preview traffic never pollute the data.
 */
const GA_ID = "G-VXS177VWT2"

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
    if (typeof window.gtag !== "function") return
    const query = searchParams?.toString()
    const path = query ? `${pathname}?${query}` : pathname
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  )
}
