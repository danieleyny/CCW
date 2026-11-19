"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RuleReviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[58svh] place-items-center px-4 text-center">
      <div className="max-w-md rounded-2xl border border-[var(--staff-line)] bg-[var(--staff-paper)] p-8 shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--staff-red-bg)] text-[var(--staff-red)]"><AlertTriangle className="size-6" /></span>
        <h1 className="mt-4 font-[family-name:var(--font-title)] text-3xl text-[var(--staff-ink)]">Didn&apos;t load.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--staff-muted)]">Nothing was reviewed or changed.</p>
        <Button type="button" onClick={reset} className="mt-5 bg-[var(--staff-navy)] text-white hover:bg-[var(--staff-navy)]/90"><RefreshCw className="size-4" />Try again</Button>
      </div>
    </div>
  )
}
