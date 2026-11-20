"use client"

import { RefreshCcw } from "lucide-react"

export default function PipelineError({ reset }: { error: Error; reset: () => void }) {
  return <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white px-6 py-14 text-center shadow-sm"><h1 className="font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">The pipeline didn&apos;t load.</h1><p className="mt-3 text-sm leading-relaxed text-[#667085]">Nothing was changed. Case pages still work.</p><button type="button" onClick={reset} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white"><RefreshCcw className="size-4" />Try again</button></div>
}
