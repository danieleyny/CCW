import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { buildPdf } from "@/lib/pdf/builder"
import { assembleApplicationTab } from "@/lib/portal/application-tab"
import type { SlotState } from "@/lib/portal/application-tab"

type DB = SupabaseClient<Database>

const SLOT_STATE_WORD: Record<SlotState, string> = {
  accepted: "Accepted",
  submitted: "Uploaded — awaiting review",
  rejected: "Sent back",
  missing: "Not uploaded",
}

/**
 * The INTERNAL 17-step application record — a work-product snapshot of exactly what
 * staff transcribe into the NYPD portal, in the portal's order and headings. Never the
 * applicant's document and never filed; it's the office's paper trail of the entry.
 *
 * The SSN is deliberately NOT in it — a downloaded file persists, so the SSN stays
 * click-to-reveal in the app only. Same reason the worksheet field shows a placeholder.
 */
export async function assembleApplicationRecord(admin: DB, caseId: string): Promise<{ pdf: Uint8Array; fileName: string } | null> {
  const data = await assembleApplicationTab(admin, caseId)
  if (!data) return null

  const pdf = await buildPdf(
    (c) => {
      c.heading("NYPD portal — application record", `${data.applicant} · internal work product`)
      c.para(
        "This is the office record of what was entered into the NYPD online portal, in the portal's own order and headings. It is not an application, is never filed, and is never given to the applicant. The SSN is omitted here — it is revealed in the app only.",
        { color: "muted", size: 9.5, gap: 12 }
      )

      const readiness = data.readiness.readyToFinalize
        ? "Ready to finalize"
        : data.readiness.readyToEnter
          ? "Ready to enter (uploads still outstanding)"
          : "Not ready to enter"
      c.para(`Readiness: ${readiness}`, { medium: true, gap: 14 })

      for (const section of data.sections) {
        c.h2(`Step ${section.no} — ${section.title}`)

        if (section.kind === "uploads") {
          if (data.slots.length === 0) {
            c.para("No portal uploads on this application.", { color: "muted" })
          } else {
            for (const slot of data.slots) {
              const star = slot.starred ? " *" : ""
              const file = slot.fileName ? ` — ${slot.fileName}` : ""
              c.para(`${slot.portalLabel}${star}: ${SLOT_STATE_WORD[slot.state]}${file}`)
              if (slot.rejectionNote) c.para(`   Note: ${slot.rejectionNote}`, { color: "muted", size: 9.5 })
            }
          }
          if (data.heldForInterview.length > 0) {
            c.spacer(4)
            c.para("Held for the interview — NOT uploaded to the portal:", { medium: true, size: 9.5 })
            for (const h of data.heldForInterview) c.para(`   · ${h.title}`, { color: "muted", size: 9.5 })
          }
          continue
        }

        if (section.kind === "checkpoint") {
          c.para(section.note ?? "", { color: "muted" })
          continue
        }

        if (section.fields.length === 0) {
          c.para(section.note ?? "Nothing to enter on this screen.", { color: "muted" })
          continue
        }
        for (const field of section.fields) {
          const value = field.notApplicable
            ? field.value
            : field.value || (field.atFiling ? "— enter at filing —" : "— MISSING —")
          c.para(`${field.label}: ${value}`, field.missing && !field.notApplicable ? { color: "brass", medium: true } : {})
        }
      }
    },
    { docTitle: "Application record", applicantName: data.applicant, caseRef: caseId.slice(0, 8) }
  )

  const safe = data.applicant.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "applicant"
  return { pdf, fileName: `application-record-${safe}.pdf` }
}
