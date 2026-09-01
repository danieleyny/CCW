import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { buildPortalWorksheet, type WorksheetSection } from "@/lib/disclosures/worksheet-portal"
import { computePortalReadiness, type PortalReadiness } from "@/lib/disclosures/readiness"
import { getCaseRequirements } from "@/lib/requirements"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { PORTAL_UPLOAD_SLOTS } from "@/config/portal-steps"

type DB = SupabaseClient<Database>

/** The transcribe-ready state of one portal upload slot (step 13). */
export type SlotState = "accepted" | "submitted" | "rejected" | "missing"

export interface PortalSlotView {
  portalLabel: string
  reqCode: string
  starred: boolean
  imageOnly: boolean
  state: SlotState
  /** The uploaded file's own name, when present. */
  fileName: string | null
  /** The document id to open (on-click signed URL). Null when nothing is uploaded. */
  documentId: string | null
  /** Rejection note shown to staff when the slot was sent back. */
  rejectionNote: string | null
  /** This slot is filled by a file uploaded for another requirement (a shared passport). */
  sharedFromLabel: string | null
}

/** A document the portal does NOT collect — held in our file for the interview. */
export interface HeldItem {
  reqCode: string
  title: string
}

export interface ApplicationTabData {
  applicant: string
  sections: WorksheetSection[]
  slots: PortalSlotView[]
  heldForInterview: HeldItem[]
  readiness: PortalReadiness
  /** An SSN is on file (encrypted). The value is revealed on click, never at render. */
  ssnConfigured: boolean
  /** Portal step numbers a staffer has marked as entered (progress bookkeeping). */
  enteredSteps: number[]
}

/**
 * Everything the admin Application tab needs, assembled server-side. Staff-only —
 * the caller must have passed requireStaff(). Deliberately mints NO signed URLs and
 * decrypts NO SSN at render: the tab reveals both on click through server actions,
 * so a case page load never logs an SSN decrypt or leaks a bearer URL into history.
 */
export async function assembleApplicationTab(admin: DB, caseId: string): Promise<ApplicationTabData | null> {
  const [assembled, { data: kase }, { data: discRows }, reqRows, ssnConfigured] = await Promise.all([
    assembleApplicationValues(admin, caseId),
    admin.from("cases").select("is_renewal, license_track, clients:client_id(full_name, email, phone)").eq("id", caseId).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["DSC-01", "QUE-01", "CON-01"]),
    getCaseRequirements(admin, caseId),
    hasCaseSsn(admin, caseId),
  ])
  if (!assembled) return null

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
    licenseTrack: kase?.license_track ?? null,
    confidentiality,
  })

  // Step-13 slots + latest uploaded document per requirement (newest first).
  const { data: docs } = await admin
    .from("documents")
    .select("id, req_code, type, file_name, status, version, review_notes, generated, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
  const docById = new Map((docs ?? []).map((d) => [d.id, d]))
  const crByCode = new Map(reqRows.map((r) => [r.req_code, r]))

  const slots: PortalSlotView[] = []
  for (const slot of PORTAL_UPLOAD_SLOTS) {
    const cr = crByCode.get(slot.reqCode)
    if (!cr || cr.status === "na") continue // not on this case → not a slot

    // The applicant's own upload for this requirement (by req_code, or the type the
    // slot declares for legacy untagged uploads). Newest wins (docs are desc).
    let doc = (docs ?? []).find((d) => !d.generated && (d.req_code === slot.reqCode || d.type === slot.documentType)) ?? null
    let sharedFromLabel: string | null = null
    // Smart documents: a requirement can be answered by a file uploaded for a
    // sibling (one passport → IDN-01/02/03). Surface the shared file, named.
    if (!doc && cr.document_id) {
      const shared = docById.get(cr.document_id)
      if (shared && !shared.generated && shared.req_code !== slot.reqCode) {
        doc = shared
        sharedFromLabel = shared.file_name ?? "another upload"
      }
    }

    let state: SlotState
    if (cr.status === "satisfied" || doc?.status === "approved") state = "accepted"
    else if (doc?.status === "rejected") state = "rejected"
    else if (doc) state = "submitted"
    else state = "missing"

    slots.push({
      portalLabel: slot.portalLabel,
      reqCode: slot.reqCode,
      starred: slot.starred,
      imageOnly: !!slot.imageOnly,
      state,
      fileName: doc?.file_name ?? null,
      documentId: doc?.id ?? null,
      rejectionNote: doc?.status === "rejected" ? doc.review_notes ?? null : null,
      sharedFromLabel,
    })
  }

  // Everything the portal does NOT collect as an upload — our file, for the interview.
  const heldForInterview: HeldItem[] = reqRows
    .filter((r) => r.requirement?.destination === "interview" && r.status !== "na")
    .map((r) => ({ reqCode: r.req_code, title: r.requirement?.title ?? r.req_code }))

  // Transcription progress (which steps a staffer has ticked off). Defensive: if the
  // table isn't migrated yet on this database, treat it as no progress rather than fail.
  let enteredSteps: number[] = []
  try {
    const { data: progress } = await admin.from("portal_entry_progress").select("step_no").eq("case_id", caseId)
    enteredSteps = (progress ?? []).map((p) => p.step_no)
  } catch {
    enteredSteps = []
  }

  const readiness = computePortalReadiness(
    assembled.values,
    disclosures,
    reqRows.map((r) => ({ reqCode: r.req_code, status: r.status })),
    {
      licenseTrack: kase?.license_track ?? null,
      // A signed answers+authorization record: the DSC-01/QUE-01 requirement satisfied.
      signedRecordSatisfied: reqRows.some((r) => (r.req_code === "DSC-01" || r.req_code === "QUE-01") && r.status === "satisfied"),
    }
  )

  return {
    applicant: client?.full_name ?? "Applicant",
    sections,
    slots,
    heldForInterview,
    readiness,
    ssnConfigured,
    enteredSteps,
  }
}
