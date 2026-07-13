"use client"

import { ErrorState } from "@/components/shared/error-state"

export default function MarketingError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} home="/" />
}
