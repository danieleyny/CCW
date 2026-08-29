"use client"

import { useState } from "react"
import { Copy, Check, AlertTriangle } from "lucide-react"
import type { WorksheetSection } from "@/lib/disclosures/worksheet-portal"

/**
 * The staff portal-entry worksheet — every value in the NYPD online portal's order and
 * format, with a copy button per field (typing 100+ fields by hand is where
 * transcription errors come from) and a red flag on anything missing (a blank line
 * gets typed as a blank answer). Internal work product; the applicant never sees it.
 */
export function PortalWorksheet({ sections, applicant }: { sections: WorksheetSection[]; applicant: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1200)
    } catch {
      /* clipboard blocked — the value is still visible to select manually */
    }
  }

  const missingCount = sections.reduce((n, s) => n + s.fields.filter((fld) => fld.missing).length, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
        <strong>Internal work product — staff only.</strong> Transcribe these into the NYPD online portal
        in this order. {missingCount > 0 ? `${missingCount} field(s) are missing (flagged red) — chase them before filing.` : "Every expected field is present."}
      </div>

      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-hairline bg-card">
          <h3 className="border-b border-hairline px-4 py-2.5 text-sm font-semibold">{section.title}</h3>
          <div className="divide-y divide-hairline">
            {section.fields.map((fld, i) => {
              const key = `${section.title}-${i}`
              return (
                <div key={key} className="flex items-start justify-between gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-low">{fld.label}</div>
                    <div className={`mt-0.5 text-sm ${fld.missing ? "text-danger" : "text-foreground"}`}>
                      {fld.value ? (
                        fld.value
                      ) : fld.atFiling ? (
                        <span className="text-text-low">— enter at filing —</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-danger">
                          <AlertTriangle className="size-3.5" /> missing
                        </span>
                      )}
                    </div>
                  </div>
                  {fld.value && (
                    <button
                      type="button"
                      onClick={() => copy(key, fld.value)}
                      className="shrink-0 rounded-md border border-hairline p-1.5 text-text-low hover:bg-surface-3 hover:text-foreground"
                      aria-label={`Copy ${fld.label}`}
                    >
                      {copied === key ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-text-low">Applicant: {applicant} · This sheet is internal and is never given to the applicant.</p>
    </div>
  )
}
