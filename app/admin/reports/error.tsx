"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <div className="mx-auto max-w-xl rounded-2xl border border-[var(--danger)]/25 bg-[var(--surface-1)] p-8 text-center shadow-sm"><TriangleAlert className="mx-auto size-8 text-[var(--danger)]" /><h1 className="mt-4 font-[family-name:var(--font-title)] text-2xl font-semibold">Couldn&apos;t load reports</h1><p className="mt-2 text-sm text-[var(--text-mid)]">Nothing was changed. Try the report again.</p><Button className="mt-5" onClick={reset}>Retry</Button></div>
}
