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
 * The INTERNAL, track-aware application record — a work-product snapshot used to QA and
 * guide the applicant through the NYPD portal in its own order and headings. Staff never
 * control the portal or file; the applicant enters/confirms the information and submits.
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
        "This is the office preparation and filing-support record, arranged in the NYPD portal's own order and headings. The applicant controls the portal, enters or confirms the information, and files. This record is not an application, is never filed, and is never given to the applicant. The SSN is omitted here — it is revealed in the app only.",
        { color: "muted", size: 9.5, gap: 12 }
      )

      const readiness = data.readiness.readyToFinalize
        ? "Ready for applicant finalization"
        : data.readiness.readyToEnter
          ? "Ready for applicant entry (finalization blockers remain)"
          : "Not ready for applicant entry"
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
          const value = field.notApplicable || field.attention
            ? field.value
            : field.value || (field.atFiling ? "— enter at filing —" : "— MISSING —")
          c.para(
            `${field.label}: ${value}`,
            field.attention || (field.missing && !field.notApplicable) ? { color: "brass", medium: true } : {}
          )
        }
      }
    },
    { docTitle: "Application record", applicantName: data.applicant, caseRef: caseId.slice(0, 8) }
  )

  const safe = data.applicant.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "applicant"
  return { pdf, fileName: `application-record-${safe}.pdf` }
}
