"use server"

import { revalidatePath } from "next/cache"
import { requireStaff } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCaseSsn } from "@/lib/facts/ssn"
import { logActivity } from "@/lib/activity"

/**
 * Server actions for the admin Application tab. Both are STAFF-ONLY and do their
 * sensitive work ON CLICK, not at render — an SSN is decrypted (and logged) only when
 * a staffer presses Reveal, and a document's signed URL (a bearer token, 5-min TTL) is
 * minted only when they press View. Nothing here is reachable by an applicant or sponsor.
 */

/** Decrypt and return the case SSN for transcription. Logged by getCaseSsn. */
export async function revealCaseSsn(caseId: string): Promise<{ ssn?: string; error?: string }> {
  await requireStaff()
  const admin = createAdminClient()
  try {
    const ssn = await getCaseSsn(admin, caseId, "admin Application tab — reveal for portal entry")
    if (!ssn) return { error: "No SSN on file for this case." }
    return { ssn }
  } catch {
    return { error: "SSN could not be read (encryption key not configured)." }
  }
}

/** Mint a short-lived signed URL for one of the case's uploaded documents. */
export async function openCaseDocument(documentId: string): Promise<{ url?: string; error?: string }> {
  await requireStaff()
  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("id, case_id, file_path")
    .eq("id", documentId)
    .maybeSingle()
  if (!doc?.file_path) return { error: "This document has no stored file." }
  const { data, error } = await admin.storage.from("documents").createSignedUrl(doc.file_path, 300)
  if (error || !data?.signedUrl) return { error: "Could not open the file." }
  await logActivity({ action: "document.viewed", caseId: doc.case_id, entity: "document", entityId: doc.id, detail: { via: "application-tab" } })
  return { url: data.signedUrl }
}

/** Mark (or unmark) a portal step as transcribed — staff progress bookkeeping only. */
export async function setStepEntered(caseId: string, stepNo: number, entered: boolean): Promise<{ ok: true }> {
  const { profile } = await requireStaff()
  const admin = createAdminClient()
  if (entered) {
    await admin.from("portal_entry_progress").upsert(
      { case_id: caseId, step_no: stepNo, entered_at: new Date().toISOString(), entered_by: profile.id },
      { onConflict: "case_id,step_no" }
    )
  } else {
    await admin.from("portal_entry_progress").delete().eq("case_id", caseId).eq("step_no", stepNo)
  }
  revalidatePath(`/admin/cases/${caseId}`)
  return { ok: true }
}
