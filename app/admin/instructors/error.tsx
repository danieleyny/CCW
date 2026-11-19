"use client"
import { Button } from "@/components/ui/button"
export default function ErrorState({ reset }: { reset: () => void }) { return <div className="rounded-2xl border border-[#FDA29B] bg-white p-10 text-center"><h1 className="font-[family-name:var(--font-title)] text-2xl font-semibold">Instructors couldn’t load</h1><p className="mt-2 text-sm text-[#667085]">The roster is still safe. Try the read again.</p><Button className="mt-5" onClick={reset}>Try again</Button></div> }
