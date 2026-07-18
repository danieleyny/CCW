"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { getMyCase } from "@/lib/portal"
import { getSignaturePng } from "@/lib/signatures"
import { actionFor } from "@/lib/requirements/actions"
import {
  renderRequirementDocument,
  renderCompanionDocument,
  storeGeneratedDocument,
  recordSignatureEvent,
} from "@/lib/requirements/document-engine"
import { headers } from "next/headers"

type Result = { error?: string; ok?: boolean; documentId?: string }

/** Save (or update) a requirement's questionnaire answers. Client-owned via RLS. */
export async function saveRequirementAnswers(
  reqCode: string,
  answers: Record<string, unknown>
): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  if (!actionFor(reqCode)) return { error: "Unknown requirement" }

  const supabase = await createClient()
  const { error } = await supabase
    .from("requirement_answers")
    .upsert(
      { case_id: myCase.id, req_code: reqCode, answers: answers as never, completed_at: new Date().toISOString() },
      { onConflict: "case_id,req_code" }
    )
  if (error) return { error: error.message }

  revalidatePath("/portal/checklist")
  return { ok: true }
}

/**
 * Generate the finished document for a "generate" requirement and persist it.
 *
 * COMPLETION STATE MACHINE (Phase 3):
 *  - not notarized → the generated document IS the deliverable → satisfied.
 *  - NOTARIZED (COH-01, REF-01/02) → generation is only step one. Status stays
 *    PENDING with an explicit "notarize & upload" note; only the uploaded signed
 *    copy (staff review / recompute) can satisfy it. Generation must never slip a
 *    notarized item past the CP-5 gate.
 */
export async function generateRequirementDocument(reqCode: string): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }

  const action = actionFor(reqCode)
  if (!action || action.mode !== "generate") return { error: "That requirement isn't generated on-platform." }

  const supabase = await createClient()
  const [{ data: saved }, signaturePng] = await Promise.all([
    supabase.from("requirement_answers").select("answers").eq("case_id", myCase.id).eq("req_code", reqCode).maybeSingle(),
    getSignaturePng(supabase, myCase.id, "applicant"),
  ])
  const answers = (saved?.answers ?? {}) as Record<string, unknown>

  let documentId: string
  try {
    const doc = await renderRequirementDocument({
      reqCode,
      applicantName: myCase.client.full_name,
      answers,
      signaturePng,
    })
    // Service role: server-derived provenance (path, generated flag) on a
    // staff-reviewed table; ownership was proven by getMyCase above.
    const admin = createAdminClient()
    documentId = await storeGeneratedDocument(admin, {
      caseId: myCase.id,
      clientId: myCase.client.id,
      reqCode,
      doc,
    })

    // A signature was actually applied → log the signing act, bound to these
    // exact bytes. Without this the PNG is just a reusable image with no record.
    if (signaturePng) {
      const h = await headers()
      await recordSignatureEvent(admin, {
        caseId: myCase.id,
        signerKey: "applicant",
        documentId,
        reqCode,
        bytes: doc.bytes,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      })
    }

    if (action.notarize) {
      await admin
        .from("case_requirements")
        .update({
          document_id: documentId,
          notes: "Generated — have it notarized, then upload the signed copy to complete this.",
        })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending"])
    } else {
      await admin
        .from("case_requirements")
        .update({ status: "satisfied", document_id: documentId, notes: "Completed on platform." })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending", "na"])
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not generate the document" }
  }

  await logActivity({
    action: "requirement.document_generated",
    caseId: myCase.id,
    entity: "document",
    entityId: documentId,
    detail: { req_code: reqCode, notarize: !!action.notarize },
  })
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/documents")
  return { ok: true, documentId }
}

/** The prepared letter that helps OBTAIN an external document (ARR-01 court request). */
export async function generateCompanionDocument(reqCode: string): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  if (!actionFor(reqCode)?.companion) return { error: "No companion document for that requirement." }

  const supabase = await createClient()
  const { data: saved } = await supabase
    .from("requirement_answers")
    .select("answers")
    .eq("case_id", myCase.id)
    .eq("req_code", reqCode)
    .maybeSingle()

  try {
    const doc = await renderCompanionDocument({
      reqCode,
      applicantName: myCase.client.full_name,
      answers: (saved?.answers ?? {}) as Record<string, unknown>,
    })
    const admin = createAdminClient()
    const documentId = await storeGeneratedDocument(admin, {
      caseId: myCase.id,
      clientId: myCase.client.id,
      reqCode,
      doc,
    })
    revalidatePath("/portal/checklist")
    return { ok: true, documentId }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not generate the letter" }
  }
}

/** "attest" requirements: a simple on-platform confirmation. */
export async function confirmAttestation(reqCode: string): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }

  const action = actionFor(reqCode)
  if (!action || action.mode !== "attest") return { error: "That requirement isn't a confirmation." }

  const admin = createAdminClient()
  const { error } = await admin
    .from("case_requirements")
    .update({ status: "satisfied", notes: "Confirmed by the applicant." })
    .eq("case_id", myCase.id)
    .eq("req_code", reqCode)
    .in("status", ["pending"])
  if (error) return { error: error.message }

  await logActivity({
    action: "requirement.attested",
    caseId: myCase.id,
    entity: "case_requirement",
    detail: { req_code: reqCode },
  })
  revalidatePath("/portal/checklist")
  return { ok: true }
}
