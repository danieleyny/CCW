"use client"

import { useState } from "react"
import { CheckCircle2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const NYPD_URL = "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"

const ITEMS: { code: string; label: string; authority: string; note: string }[] = [
  { code: "REF-01", label: "Character-reference count is still 4", authority: "38 RCNY §5-03 (contested)", note: "The count has been litigated; confirm the current requirement before assembling." },
  { code: "SOC-01", label: "3-year social-media disclosure still required", authority: "P.L. §400.00(1)(o)(iv) — CCIA 2022", note: "Contested post-Antonyuk; confirm it's still demanded and the lookback period." },
  { code: "FEE-01", label: "Application (~$340) + fingerprint (~$88.25) fees current", authority: "P.L. §400.00(15)", note: "Fees change; confirm exact amounts and payment method." },
  { code: "TRN-01", label: "18-hour training (16 classroom + 2 live-fire) unchanged", authority: "P.L. §400.00(1)(o); DCJS curriculum", note: "Confirm DCJS curriculum hours and the Duly-Authorized-Instructor requirement." },
  { code: "FMT-01", label: "NYPD upload format rules unchanged (<5MB, allowed types)", authority: "NYPD online portal", note: "Confirm size/type limits and any new portal fields." },
  { code: "AFF-01", label: "Sensitive/prohibited-location list current", authority: "P.L. §265.01-e", note: "The prohibited-locations list shifts with litigation; confirm before the applicant signs." },
]

export function VerifyLiveChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const allDone = ITEMS.every((i) => done[i.code])

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-4 py-3 text-sm",
          allDone ? "border-ok/30 bg-ok/10 text-ok" : "border-warn/30 bg-warn/10 text-warn"
        )}
      >
        <CheckCircle2 className="size-4" />
        {allDone
          ? "All provisions confirmed against the live NYPD portal — clear to assemble & file."
          : "Confirm each contested provision against the live NYPD portal before filing."}
        <a href={NYPD_URL} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 underline">
          NYPD portal <ExternalLink className="size-3" />
        </a>
      </div>

      <ul className="space-y-2">
        {ITEMS.map((i) => (
          <li key={i.code} className="rounded-lg border bg-card p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!done[i.code]}
                onChange={(e) => setDone((d) => ({ ...d, [i.code]: e.target.checked }))}
                className="mt-0.5 size-4"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">{i.code}</span>
                  <span className="text-sm font-medium">{i.label}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{i.note}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-text-low">{i.authority}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
