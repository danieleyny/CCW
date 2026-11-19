"use client"

import { CircleAlert, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ConciergeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[55svh] place-items-center">
      <div className="max-w-md rounded-2xl border border-[#F4B8B2] bg-white p-8 text-center shadow-sm">
        <CircleAlert className="mx-auto size-7 text-[#B42318]" aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-semibold text-[#101828]">The concierge queue didn&apos;t load.</h1>
        <p className="mt-2 text-sm text-[#667085]">Nothing was changed.</p>
        <Button type="button" variant="outline" className="mt-5" onClick={reset}><RefreshCw className="size-4" aria-hidden />Try again</Button>
      </div>
    </div>
  )
}
