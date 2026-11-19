"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CalendarError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <div className="grid min-h-[420px] place-items-center px-4 text-center"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FEF3F2] text-[#B42318]"><AlertTriangle className="size-6" /></span><h1 className="mt-4 font-display text-2xl font-semibold text-[#101828]">Calendar couldn’t load</h1><p className="mt-2 text-sm text-[#667085]">The calendar hit an error before any schedule data changed. Try again; if it continues, the source status will need review.</p><Button type="button" onClick={reset} className="mt-5 bg-[#14254A] text-white hover:bg-[#1C315F]"><RefreshCw className="size-4" />Try again</Button></div></div>
}
