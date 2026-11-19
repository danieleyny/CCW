"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <div className="mx-auto max-w-[1480px] pb-12"><header><h1 className="font-[family-name:var(--font-title)] text-[32px] font-semibold">Privacy</h1><p className="mt-1 text-sm text-[#667085]">Access, correction and deletion requests from applicants, and what we keep.</p></header><div className="mt-5 rounded-2xl border border-[#F0B8B4] bg-white p-8 text-center shadow-sm"><TriangleAlert className="mx-auto size-8 text-[#B42318]" aria-hidden /><h2 className="mt-4 font-[family-name:var(--font-title)] text-2xl font-semibold">Couldn&apos;t load requests</h2><p className="mt-2 text-sm text-[#667085]">The privacy records were not changed.</p><Button className="mt-5" onClick={unstable_retry}>Retry</Button></div><nav aria-label="Privacy sections" className="mt-5 grid grid-cols-3 rounded-xl border border-black/10 bg-white p-1 text-center text-xs font-semibold text-[#667085]"><Link href="/admin/privacy" className="rounded-lg bg-[#14254A] px-2 py-2 text-white">Open</Link><Link href="/admin/privacy?tab=closed" className="rounded-lg px-2 py-2 hover:bg-[#F2F4F7]">Closed</Link><Link href="/admin/privacy?tab=retention" className="rounded-lg px-2 py-2 hover:bg-[#F2F4F7]">Retention</Link></nav></div>
}
