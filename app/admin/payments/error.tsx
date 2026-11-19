"use client"

import { Button } from "@/components/ui/button"

export default function PaymentsError({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return <div className="mx-auto grid min-h-[55svh] max-w-[1520px] place-items-center px-5 text-center"><div><h1 className="font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">Payments didn&apos;t load</h1><p className="mt-2 text-sm text-[#667085]">Nothing was charged or changed.</p><Button type="button" onClick={() => unstable_retry()} className="mt-5 bg-[#14254A] text-white">Try again</Button></div></div>
}
