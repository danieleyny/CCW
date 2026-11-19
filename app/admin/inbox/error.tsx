"use client"

import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InboxError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <div className="mx-auto max-w-2xl rounded-2xl border border-[#FDA29B] bg-[#FEF3F2] p-8 text-center text-[#101828]"><CircleAlert className="mx-auto size-8 text-[#B42318]" /><h1 className="mt-3 font-display text-3xl">Messages didn&apos;t load.</h1><p className="mt-2 text-sm text-[#667085]">Nothing was sent or changed.</p><Button onClick={unstable_retry} className="mt-5">Try again</Button></div>
}
