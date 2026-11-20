"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function CasesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-black/15 bg-white px-6 text-center">
      <div>
        <h1 className="font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">Cases didn&apos;t load</h1>
        <p className="mt-2 text-sm text-[#667085]">Nothing was changed.</p>
        <Button onClick={reset} className="mt-5 bg-[#14254A] text-white">Try again</Button>
      </div>
    </div>
  )
}
