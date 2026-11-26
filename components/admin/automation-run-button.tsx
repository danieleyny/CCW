"use client"

import { useFormStatus } from "react-dom"
import { Play, RefreshCw } from "lucide-react"

export function AutomationRunButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] hover:bg-[#E4C473] disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? <RefreshCw className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
      {pending ? "Researching and drafting…" : "Create the next draft now"}
    </button>
  )
}
