import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { buildPortalWorksheet, type WorksheetSection } from "@/lib/disclosures/worksheet-portal"
import { computePortalReadiness, type PortalReadiness } from "@/lib/disclosures/readiness"
import { getCaseRequirements } from "@/lib/requirements"
import { actionFor, actionWetInk } from "@/lib/requirements/actions"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { uploadSlotsFor, claimedUploadCodesFor, portalTrackForCase } from "@/config/portal-steps"
import type { CaseRequirementRow } from "@/lib/requirements/materialize"
import { computeCompletion, type CompletionMetrics } from "@/lib/portal/completion"

type DB = SupabaseClient<Database>

/** The filing-support state of one portal upload slot / interview document. */
export type SlotState = "accepted" | "submitted" | "rejected" | "missing"

export interface PortalSlotView {
  portalLabel: string
  /** The requirement actually filling this slot (the materialised one of the slot's set). */
  reqCode: string | null
  starred: boolean
  imageOnly: boolean
  /** The portal's Additional-Documents catch-all (optional, may hold nothing). */
  isCatchAll: boolean
  state: SlotState
  /** The uploaded file's own name, when present. */
  fileName: string | null
  /** The document id to open (on-click signed URL). Null when nothing is uploaded. */
  documentId: string | null
  /** Rejection note shown to staff when the slot was sent back. */
  rejectionNote: string | null
  /** What we auto-converted / why a file needs manual conversion (finding 8) — so staff
   *  know exactly what they're sending to NYPD, and that only format/size was fixed. */
  conversionNote: string | null
  /** This upload still needs a person to convert it before filing — a real blocker, not a
   *  footnote. The requirement can't satisfy and the case can't be ready until it's done. */
  conversionPending: boolean
  /** This slot is filled by a file uploaded for another requirement (a shared passport). */
  sharedFromLabel: string | null
}

/**
 * A document the portal does NOT collect online — held in our file for the in-person
 * interview (references, notarised release, affidavits, safeguard ack, citizenship
 * proof, CoR…). Full state so staff can see what's actually in hand and open it.
 */
export interface HeldItem {
  reqCode: string
  title: string
  destination: "interview" | "internal"
  state: SlotState
  fileName: string | null
  documentId: string | null
  rejectionNote: string | null
  /** This document must be notarised to be acceptable (REL-01, COH-01, FAM-01…). */
  notarizedRequired: boolean
  /** The document in hand is notarised. */
  notarized: boolean
}

export interface ApplicationTabData {
  applicant: string
  sections: WorksheetSection[]
  slots: PortalSlotView[]
  heldForInterview: HeldItem[]
  readiness: PortalReadiness
  /** An SSN is on file (encrypted). The value is revealed on click, never at render. */
  ssnConfigured: boolean
  /** Portal step numbers staff have marked complete while guiding the applicant. */
  enteredSteps: number[]
  /** Portal / interview / overall completion — one pass, so the numbers agree. */
  metrics: CompletionMetrics
}

/**
 * Everything the admin Application tab needs, assembled server-side. Staff-only —
 * the caller must have passed requireStaff(). Deliberately mints NO signed URLs and
 * decrypts NO SSN at render: the tab reveals both on click through server actions,
 * so a case page load never logs an SSN decrypt or leaks a bearer URL into history.
 */
export async function assembleApplicationTab(admin: DB, caseId: string): Promise<ApplicationTabData | null> {
  const [assembled, { data: kase }, { data: discRows }, reqRows, ssnConfigured, { data: intakeRow }] = await Promise.all([
    assembleApplicationValues(admin, caseId),
    admin.from("cases").select("is_renewal, license_track, clients:client_id(full_name, email, phone, track)").eq("id", caseId).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["DSC-01", "QUE-01", "CON-01"]),
    getCaseRequirements(admin, caseId),
    hasCaseSsn(admin, caseId),
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
  ])
  if (!assembled) return null

  // The portal SEQUENCE and the upload-slot set depend on the resolved PORTAL flow —
  // Special Carry is the non-resident, non-sponsored individual (not a license_track).
  const track = kase?.license_track ?? null
  const clientTrack = (kase?.clients as unknown as { track?: string | null } | null)?.track ?? null
  const portalTrack = portalTrackForCase({ clientTrack, licenseTrack: track })
  const isRetiredLeo = !!(intakeRow?.answers as Record<string, unknown> | null)?.isRetiredLeo

  const client = (kase?.clients as unknown as { full_name: string; email: string | null; phone: string | null } | null) ?? null
  const disclosures =
    ((discRows ?? []).find((r) => r.req_code === "DSC-01")?.answers ??
      (discRows ?? []).find((r) => r.req_code === "QUE-01")?.answers ??
      {}) as Record<string, unknown>
  const confidentiality = ((discRows ?? []).find((r) => r.req_code === "CON-01")?.answers ?? {}) as Record<string, unknown>

  const sections = buildPortalWorksheet(assembled.values, disclosures, {
    isRenewal: !!kase?.is_renewal,
    phone: client?.phone,
    email: client?.email,
    // Placeholder only — the real SSN is revealed on click via a server action, never
    // decrypted at render. Non-empty so the field doesn't read as a missing answer.
    ssnLast4: ssnConfigured ? "•••• — reveal in this tab" : "",
    licenseTrack: track,
    portalTrack,
    isRetiredLeo,
    confidentiality,
  })

  // Step-13 slots + latest uploaded document per requirement (newest first).
  const { data: docs } = await admin
    .from("documents")
    .select("id, req_code, type, file_name, file_path, status, version, review_notes, generated, created_at, notarized, conversion_note, conversion_pending")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
  // A metadata row without storage bytes is not an upload. Legacy/demo placeholders
  // used to make the application screen say "Uploaded" and expose a dead View action.
  const uploadedDocs = (docs ?? []).filter((d) => !!d.file_path?.trim())
  const docById = new Map(uploadedDocs.map((d) => [d.id, d]))
  const crByCode = new Map(reqRows.map((r) => [r.req_code, r]))
  type DocRow = NonNullable<typeof docs>[number]

  /**
   * Resolve the current uploaded document + state for one requirement, honouring
   * smart-document sharing (a passport uploaded for IDN-01 answering IDN-02/03).
   */
  const resolveDoc = (cr: CaseRequirementRow, matchType?: string): { doc: DocRow | null; sharedFromLabel: string | null; state: SlotState } => {
    let doc = uploadedDocs.find((d) => !d.generated && (d.req_code === cr.req_code || (matchType && d.type === matchType))) ?? null
    let sharedFromLabel: string | null = null
    if (!doc && cr.document_id) {
      const shared = docById.get(cr.document_id)
      if (shared && !shared.generated && shared.req_code !== cr.req_code) {
        doc = shared
        sharedFromLabel = shared.file_name ?? "another upload"
      }
    }
    let state: SlotState
    if (cr.status === "satisfied" || doc?.status === "approved") state = "accepted"
    else if (doc?.status === "rejected") state = "rejected"
    else if (doc) state = "submitted"
    else state = "missing"
    return { doc, sharedFromLabel, state }
  }

  const slots: PortalSlotView[] = []
  for (const slot of uploadSlotsFor(portalTrack)) {
    if (slot.reqCodes.length === 0) {
      // Additional Documents — the catch-all. Any leftover portal_upload upload not
      // claimed by a named slot is parked here so it's never silently dropped.
      const leftoverDocs = uploadedDocs.filter(
        (d) => !d.generated && d.req_code != null && !claimedUploadCodesFor(portalTrack).includes(d.req_code) &&
          reqRows.find((r) => r.req_code === d.req_code)?.requirement?.destination === "portal_upload"
      )
      const doc = leftoverDocs[0] ?? null
      slots.push({
        portalLabel: slot.portalLabel,
        reqCode: doc?.req_code ?? null,
        starred: false,
        imageOnly: false,
        isCatchAll: true,
        state: doc ? (doc.status === "approved" ? "accepted" : doc.status === "rejected" ? "rejected" : "submitted") : "missing",
        fileName: doc?.file_name ?? null,
        documentId: doc?.id ?? null,
        rejectionNote: doc?.status === "rejected" ? doc.review_notes ?? null : null,
        conversionNote: doc?.conversion_note ?? null,
        conversionPending: !!doc?.conversion_pending,
        sharedFromLabel: null,
      })
      continue
    }

    // Named slot: the materialised requirement of the slot's set (COH-01 or COH-02,
    // TRN-01 or RNW-01 — the engine puts exactly one on the case).
    const cr = slot.reqCodes.map((c) => crByCode.get(c)).find((c): c is CaseRequirementRow => !!c && c.status !== "na")
    if (!cr) continue // none of this slot's requirements are on this case

    const { doc, sharedFromLabel, state } = resolveDoc(cr, slot.documentType)
    slots.push({
      portalLabel: slot.portalLabel,
      reqCode: cr.req_code,
      starred: slot.starred,
      imageOnly: !!slot.imageOnly,
      isCatchAll: false,
      state,
      fileName: doc?.file_name ?? null,
      documentId: doc?.id ?? null,
      rejectionNote: doc?.status === "rejected" ? doc.review_notes ?? null : null,
      conversionNote: doc?.conversion_note ?? null,
        conversionPending: !!doc?.conversion_pending,
      sharedFromLabel,
    })
  }

  // Everything the portal does NOT collect online — held in our file for the interview.
  // Now a FULL view: state + file + notarisation, openable from the tab.
  const heldForInterview: HeldItem[] = reqRows
    .filter((r) => r.requirement?.destination === "interview" && r.status !== "na")
    .map((r) => {
      const { doc, state } = resolveDoc(r)
      const wet = actionWetInk(actionFor(r.req_code))
      return {
        reqCode: r.req_code,
        title: r.requirement?.title ?? r.req_code,
        destination: "interview" as const,
        state,
        fileName: doc?.file_name ?? null,
        documentId: doc?.id ?? null,
        rejectionNote: doc?.status === "rejected" ? doc.review_notes ?? null : null,
        notarizedRequired: wet === "notary",
        notarized: !!doc?.notarized,
      }
    })

  // Guided-filing progress (which steps staff have ticked off). Defensive: if the
  // table isn't migrated yet on this database, treat it as no progress rather than fail.
  let enteredSteps: number[] = []
  try {
    const { data: progress } = await admin.from("portal_entry_progress").select("step_no").eq("case_id", caseId)
    enteredSteps = (progress ?? []).map((p) => p.step_no)
  } catch {
    enteredSteps = []
  }

  // The signed answers + authorization record — DSC-01 (or legacy QUE-01) on this case.
  const signedRow = reqRows.find((r) => r.req_code === "DSC-01" || r.req_code === "QUE-01")
  const signedRecord = signedRow ? { reqCode: signedRow.req_code, satisfied: signedRow.status === "satisfied" } : null

  // A requirement whose current bound document still needs a person to convert it (a PDF
  // photo) must not let the case report ready — keyed on the requirement's bound document.
  const conversionPendingReqCodes = reqRows
    .filter((r) => r.document_id && docById.get(r.document_id)?.conversion_pending)
    .map((r) => r.req_code)

  const readiness = computePortalReadiness(
    assembled.values,
    disclosures,
    reqRows.map((r) => ({ reqCode: r.req_code, status: r.status })),
    {
      portalTrack,
      signedRecordSatisfied: !!signedRecord?.satisfied,
      conversionPendingReqCodes,
    }
  )

  const metrics = computeCompletion({ sections, slots, held: heldForInterview, signedRecord })

  return {
    applicant: client?.full_name ?? "Applicant",
    sections,
    slots,
    heldForInterview,
    readiness,
    ssnConfigured,
    enteredSteps,
    metrics,
  }
}
