/**
 * PART B / Phase 4 — the one-click FILING PACK.
 *
 * Turns "here's a pile of PDFs, good luck" into copy-and-go. One guided PDF:
 *
 *   1. Cover + how-to-file  — you file your own application; we never submit it.
 *   2. Portal-entry worksheet — your Section A/B answers in the form's order,
 *      rendered from the coverage map so it can't drift (lib/requirements/worksheet).
 *   3. Upload guide — for each document: what it is, whether it's ready, and
 *      that it goes in the portal's document-upload area.
 *   4. The assembled, NYPD-ordered document packet (lib/packet/assemble).
 *
 * NON-NEGOTIABLE: no NYPD credentials, no submission. The applicant files at
 * licensing.nypdonline.org. The generated documents are UNBRANDED (the builder
 * carries no firm mark or attribution) — they are the applicant's own submissions.
 *
 * Service-role only (reads Storage + the whole case), like assemblePacket.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { buildPdf } from "@/lib/pdf/builder"
import { assemblePacket, mergePdfs, docOrderIndex } from "@/lib/packet/assemble"
import { buildWorksheet } from "@/lib/requirements/worksheet"
import { actionFor } from "@/lib/requirements/actions"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { assembleApplicationValues } from "@/lib/forms/prepare"

type DB = SupabaseClient<Database>

interface GuideDoc {
  reqCode: string
  label: string
  documentType: string
  provided: boolean
  blocking: boolean
  howTo: string
}

export interface FilingPackResult {
  pdf: Uint8Array
  /** Counts for the surface that offers the download. */
  summary: { documents: number; provided: number; outstanding: number }
}

const PORTAL_URL = "licensing.nypdonline.org"

export async function assembleFilingPack(admin: DB, caseId: string): Promise<FilingPackResult> {
  const { data: kase } = await admin
    .from("cases")
    .select("nypd_app_ref, is_renewal, clients(full_name, email, phone, zip)")
    .eq("id", caseId)
    .single()
  const client = (kase?.clients as unknown as { full_name: string; email: string | null; phone: string | null; zip: string | null } | null) ?? null
  const applicant = client?.full_name ?? "Applicant"
  const appRef = (kase as unknown as { nypd_app_ref: string | null } | null)?.nypd_app_ref ?? null

  // The assembled application values — the SAME resolver the prepared PD 643-041
  // fills from (facts + intake + the canonical Section B store). Both the worksheet
  // and the in-pack prepared form read these, so they can never disagree.
  const assembled = await assembleApplicationValues(admin, caseId)
  const appValues = assembled?.values ?? null

  // Which upload documents apply to this case, and whether each is in hand.
  const { data: reqRows } = await admin
    .from("case_requirements")
    .select("req_code, status, document_id, requirement:requirements(document_type, title, blocking)")
    .eq("case_id", caseId)

  const guide: GuideDoc[] = []
  for (const r of reqRows ?? []) {
    const req = r.requirement as unknown as { document_type: string | null; title: string; blocking: boolean } | null
    if (!req?.document_type) continue // attestation-only requirement, nothing to upload
    if (r.status === "na") continue // doesn't apply to this case
    if (isSystemVerified(r.req_code)) continue
    const action = actionFor(r.req_code)
    guide.push({
      reqCode: r.req_code,
      label: action?.customerTitle ?? req.title,
      documentType: req.document_type,
      provided: r.status === "satisfied" || !!r.document_id,
      blocking: req.blocking,
      howTo: uploadInstruction(action),
    })
  }
  guide.sort((a, b) => docOrderIndex(a.documentType) - docOrderIndex(b.documentType))

  const worksheet = appValues
    ? buildWorksheet(appValues, {
        applicantName: applicant,
        phone: client?.phone ?? null,
        email: client?.email ?? null,
        zip: client?.zip ?? null,
      })
    : []

  // PORTAL_ALIGNMENT_REBUILD: we no longer produce a filled PD 643-041 — the portal
  // is the filing surface and staff transcribe from the worksheet. The paper-form fill
  // is retired here (deleted in the final phase); the pack leads with the worksheet.
  const preparedApp: Uint8Array | null = null

  const pdfMeta = { docTitle: "Filing Pack", applicantName: applicant, caseRef: appRef ?? undefined }

  // ── Cover / how-to-file (leads the pack; the prepared application follows it) ──
  const cover = await buildPdf(
    (c) => {
      c.heading("Your Filing Pack", "Everything you need to submit your own application")
      c.para(
        `You file your own application at ${PORTAL_URL} — we prepare and organize it, but only you (or a New York-licensed attorney) can submit it to the NYPD License Division. This pack leads with your prepared application, then the answers to type in, a guide to which document goes where, and your assembled documents.`,
        { size: 10.5 }
      )
      c.spacer()
      c.para(`Applicant: ${applicant}`, { size: 11 })
      if (appRef) c.para(`NYPD reference: ${appRef}`, { size: 10, color: "muted" })
      if (preparedApp) {
        c.spacer()
        c.h2("Part 1 — Your prepared application (PD 643-041)")
        c.para(
          "The pages that follow are your Handgun License Application, filled from everything on file. Review every field, then use it as you enter your answers online. Your Social Security number and the handgun list are left blank to complete at filing. A form marked “DRAFT — INCOMPLETE” still has blanks — finish your details first.",
          { size: 10 }
        )
      }
    },
    pdfMeta
  )

  // ── Worksheet + upload guide (follow the prepared application) ─────────────
  const guidePdf = await buildPdf(
    (c) => {
      c.h2("Part 2 — What to type into the application")
      c.para(
        `Enter these at ${PORTAL_URL}, in the order the form asks. Lines marked "enter at filing" are ones we deliberately don't store — like your Social Security number.`,
        { size: 10 }
      )
      for (const section of worksheet) {
        c.spacer()
        c.h2(section.label)
        for (const row of section.rows) {
          const label = row.questionNo ? `Q${row.questionNo}. ${row.label}` : row.label
          c.para(label, { size: 9, color: "muted" })
          for (const line of row.value.split("\n")) c.para(line, { size: 11 })
        }
      }

      c.pageBreak()
      c.h2("Part 3 — Your documents, and where each goes")
      c.para(
        `Upload each of these in the portal's document-upload section. A ✓ means we've prepared or received it and it's in the assembled packet that follows; a ▢ means it's still outstanding.`,
        { size: 10 }
      )
      c.spacer()
      if (guide.length === 0) {
        c.para("No supporting documents apply to your case yet — finish your intake to build the list.", { size: 10.5, color: "muted" })
      }
      for (const d of guide) {
        const mark = d.provided ? "✓" : "▢"
        c.para(`${mark}  ${d.label}${d.blocking ? "" : "  (optional)"}`, { size: 11 })
        c.para(`     ${d.howTo}`, { size: 9.5, color: "muted" })
      }
      const outstanding = guide.filter((d) => !d.provided && d.blocking)
      if (outstanding.length) {
        c.spacer()
        c.para(
          `${outstanding.length} required document(s) are still outstanding. You can file once you have them — this pack updates every time you download it.`,
          { size: 10, color: "brass" }
        )
      }
    },
    pdfMeta
  )

  const { pdf: docsPacket } = await assemblePacket(admin, caseId)
  // Prepared application first — immediately after the cover/how-to — then the
  // worksheet + upload guide, then the assembled supporting documents.
  const pdf = await mergePdfs([cover, ...(preparedApp ? [preparedApp] : []), guidePdf, docsPacket])

  const provided = guide.filter((d) => d.provided).length
  return {
    pdf,
    summary: { documents: guide.length, provided, outstanding: guide.length - provided },
  }
}

/** One plain line telling the applicant where a document goes / how to get it. */
function uploadInstruction(action: ReturnType<typeof actionFor>): string {
  if (!action) return `Upload this file in the portal's document-upload section at ${PORTAL_URL}.`
  if (action.mode === "obtain" && action.steps.length) {
    // The last obtain step is usually "upload it here" — reframe for the portal.
    return `${action.steps.slice(0, -1).join(" ")} Then upload it in the portal's document-upload section.`.trim()
  }
  if (action.mode === "generate") return "We prepared this for you — it's in the assembled packet. Upload that page in the document-upload section."
  if (action.mode === "roster") return "Collected through the private links we sent — the notarized copies are in the assembled packet."
  return `Upload this file in the portal's document-upload section at ${PORTAL_URL}.`
}

/** File name for the download. */
export function filingPackFileName(applicantName?: string | null): string {
  const slug = (applicantName ?? "application")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return `${slug || "application"}-application-packet.pdf`
}
