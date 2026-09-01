"use client"

import { useState, type ReactNode } from "react"
import { Copy, Check, AlertTriangle, ClipboardList } from "lucide-react"
import type { WorksheetSection, WorksheetField } from "@/lib/disclosures/worksheet-portal"

/**
 * The staff portal-entry worksheet — every value in the NYPD online portal's order and
 * format, with a copy button per field (typing 100+ fields by hand is where
 * transcription errors come from) and a red flag on anything missing (a blank line
 * gets typed as a blank answer). Internal work product; the applicant never sees it.
 *
 * Section order and headings come from the sections themselves (built from
 * config/portal-steps.ts). Uploads/checkpoint steps carry a note instead of fields.
 */

/** One field row — copy button, missing red-glow, or a greyed not-applicable. */
export function FieldRow({ field, copyKey, copied, onCopy }: { field: WorksheetField; copyKey: string; copied: string | null; onCopy: (key: string, value: string) => void }) {
  if (field.notApplicable) {
    return (
      <div className="flex items-start justify-between gap-3 px-4 py-2 opacity-60">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-low">{field.label}</div>
          <div className="mt-0.5 text-sm italic text-text-low">{field.value}</div>
        </div>
      </div>
    )
  }
  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-2 ${field.missing ? "bg-danger/5 ring-1 ring-inset ring-danger/40" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-text-low">{field.label}</div>
        <div className={`mt-0.5 text-sm ${field.missing ? "text-danger" : "text-foreground"}`}>
          {field.value ? (
            field.value
          ) : field.atFiling ? (
            <span className="text-text-low">— enter at filing —</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <AlertTriangle className="size-3.5" /> missing
            </span>
          )}
        </div>
      </div>
      {field.value && (
        <button
          type="button"
          onClick={() => onCopy(copyKey, field.value)}
          className="shrink-0 rounded-md border border-hairline p-1.5 text-text-low hover:bg-surface-3 hover:text-foreground"
          aria-label={`Copy ${field.label}`}
        >
          {copied === copyKey ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </div>
  )
}

/** Copy helper shared by the worksheet + the Application tab. */
export function useCopy() {
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
  return { copied, copy }
}

/** "Copy this step" — every present, non-N/A field as `Label: value` lines. */
export function stepPlainText(section: WorksheetSection): string {
  return section.fields
    .filter((fld) => fld.value && !fld.notApplicable)
    .map((fld) => `${fld.label}: ${fld.value}`)
    .join("\n")
}

export function StepCard({ section, headerRight }: { section: WorksheetSection; headerRight?: ReactNode }) {
  const { copied, copy } = useCopy()
  const missing = section.fields.filter((fld) => fld.missing).length
  const plain = stepPlainText(section)
  return (
    <section id={`step-${section.no}`} className="scroll-mt-4 rounded-lg border border-hairline bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <h3 className="text-sm font-semibold">
          <span className="mr-2 text-text-low">Step {section.no}</span>
          {section.title}
          {missing > 0 && <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">{missing} missing</span>}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {plain && (
            <button
              type="button"
              onClick={() => copy(`step-${section.no}`, plain)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-xs text-text-low hover:bg-surface-3 hover:text-foreground"
            >
              {copied === `step-${section.no}` ? <Check className="size-3.5 text-ok" /> : <ClipboardList className="size-3.5" />}
              Copy this step
            </button>
          )}
          {headerRight}
        </div>
      </div>
      {section.fields.length > 0 ? (
        <div className="divide-y divide-hairline">
          {section.fields.map((fld, i) => (
            <FieldRow key={i} field={fld} copyKey={`${section.no}-${i}`} copied={copied} onCopy={copy} />
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-text-mid">{section.note ?? "Nothing to transcribe on this screen."}</p>
      )}
    </section>
  )
}

export function PortalWorksheet({ sections, applicant }: { sections: WorksheetSection[]; applicant: string }) {
  const missingCount = sections.reduce((n, s) => n + s.fields.filter((fld) => fld.missing).length, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
        <strong>Internal work product — staff only.</strong> Transcribe these into the NYPD online portal
        in this order. {missingCount > 0 ? `${missingCount} field(s) are missing (flagged red) — chase them before filing.` : "Every expected field is present."}
      </div>

      {sections.map((section) => (
        <StepCard key={section.no} section={section} />
      ))}
      <p className="text-xs text-text-low">Applicant: {applicant} · This sheet is internal and is never given to the applicant.</p>
    </div>
  )
}
