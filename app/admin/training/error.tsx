"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TrainingError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center px-5 text-center">
      <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FFF3F2] text-[#B42318]"><AlertTriangle className="size-6" /></span><h1 className="mt-4 font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">Classes didn&apos;t load.</h1><p className="mt-2 text-sm text-[#667085]">Nothing was changed.</p><Button className="mt-5" onClick={() => unstable_retry()}>Try again</Button></div>
    </div>
  )
}
