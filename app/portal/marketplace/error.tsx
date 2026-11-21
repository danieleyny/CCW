"use client"

import { RotateCcw, TriangleAlert } from "lucide-react"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { Button } from "@/components/ui/button"

export default function MarketplaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { messages } = usePortalI18n()
  const copy = messages.marketplace

  return (
    <div className="marketplace-v2-page">
      <section className="marketplace-v2-error" role="alert">
        <span><TriangleAlert aria-hidden="true" /></span>
        <div>
          <h1>{copy.errorTitle}</h1>
          <p>{copy.errorBody}</p>
          <Button onClick={reset}><RotateCcw aria-hidden="true" />{copy.tryAgain}</Button>
        </div>
      </section>
    </div>
  )
}
