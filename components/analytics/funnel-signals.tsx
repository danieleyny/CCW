"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { trackEvent } from "@/lib/analytics"
import { analyticsContext } from "@/lib/analytics-config"

type VerifiedPurchase = {
  transactionId: string
  value: number
  currency: string
  packageKey: string | null
}

/**
 * Converts successful server-side funnel transitions into GA4 business events.
 * Query markers are removed immediately after use so Stripe session ids and
 * internal state never remain in the address bar or become page-view data.
 */
export function FunnelSignals() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!analyticsContext(window.location.hostname, window.location.pathname)) return

    let cancelled = false
    const whenAnalyticsReady = (send: () => void, attempts = 0) => {
      if (cancelled) return
      if (typeof window.gtag === "function") {
        send()
        return
      }
      if (attempts < 20) window.setTimeout(() => whenAnalyticsReady(send, attempts + 1), 100)
    }

    const signedUp = searchParams.get("new") === "1"
    const enrolled = searchParams.get("enrolled") === "1"
    const sessionId = searchParams.get("session_id")

    if (signedUp) {
      whenAnalyticsReady(() => trackEvent("sign_up", { method: "email" }))
    }

    if (enrolled && sessionId) {
      void fetch(`/api/analytics/checkout-complete?session_id=${encodeURIComponent(sessionId)}`, {
        credentials: "same-origin",
      })
        .then(async (response) => {
          if (!response.ok) return null
          return (await response.json()) as VerifiedPurchase
        })
        .then((purchase) => {
          if (!purchase) return
          const storageKey = `ga-purchase:${purchase.transactionId}`
          if (window.sessionStorage.getItem(storageKey)) return
          whenAnalyticsReady(() => {
            trackEvent("purchase", {
              transaction_id: purchase.transactionId,
              value: purchase.value,
              currency: purchase.currency,
              items: [
                {
                  item_id: purchase.packageKey ?? "service_payment",
                  item_name: purchase.packageKey ?? "Gun License NYC service",
                  price: purchase.value,
                  quantity: 1,
                },
              ],
            })
            window.sessionStorage.setItem(storageKey, "1")
          })
        })
        .catch(() => {
          // Analytics must never interfere with the paid customer experience.
        })
    }

    if (signedUp || enrolled || sessionId) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete("new")
      clean.searchParams.delete("enrolled")
      clean.searchParams.delete("session_id")
      window.history.replaceState(window.history.state, "", `${clean.pathname}${clean.search}${clean.hash}`)
    }

    return () => {
      cancelled = true
    }
  }, [pathname, searchParams])

  return null
}
