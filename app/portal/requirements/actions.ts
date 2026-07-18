"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { getMyCase } from "@/lib/portal"
import { getSignaturePng, isReasonableSignature } from "@/lib/signatures"
import { actionFor, isSignable } from "@/lib/requirements/actions"
import {
  renderRequirementDocument,
  renderCompanionDocument,
  storeGeneratedDocument,
  markGeneratedDocumentSigned,
  recordSignatureEvent,
  SIGNING_CONSENT,
} from "@/lib/requirements/document-engine"
import { headers } from "next/headers"

type Result = { error?: string; ok?: boolean; documentId?: string; needsSignature?: boolean }

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
 * Generate the document for a "generate" requirement and persist it.
 *
 * COMPLETION STATE MACHINE:
 *  - SIGNABLE (nearly all of them) → generation produces an unsigned DRAFT.
 *    Downloadable so the applicant can read it, banner-stamped "DRAFT —
 *    UNSIGNED", and it does NOT satisfy the requirement. signRequirementDocument
 *    completes it. Regenerating after an answer edit lands here again, which is
 *    exactly how a stale signature gets invalidated.
 *  - NOT signable and not notarized (worksheets) → the document IS the
 *    deliverable → satisfied.
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
  const signable = isSignable(action)

  const supabase = await createClient()
  const { data: saved } = await supabase
    .from("requirement_answers")
    .select("answers")
    .eq("case_id", myCase.id)
    .eq("req_code", reqCode)
    .maybeSingle()
  const answers = (saved?.answers ?? {}) as Record<string, unknown>

  let documentId: string
  try {
    // No signedAt ⇒ the renderer produces the DRAFT rendering. A signature image
    // on file is deliberately NOT applied here: signing is an act the applicant
    // performs on specific bytes, not a stamp we reuse behind their back.
    const doc = await renderRequirementDocument({
      reqCode,
      applicantName: myCase.client.full_name,
      answers,
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

    if (signable) {
      // Unsigned draft — bind it so the applicant can find it, but push the
      // requirement back to pending: regenerating after an edit must never leave
      // an earlier signature standing over content that has since changed.
      await admin
        .from("case_requirements")
        .update({
          status: "pending",
          document_id: documentId,
          notes: "Draft prepared — review and sign it to complete this.",
        })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending", "satisfied", "na"])
    } else if (action.notarize) {
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
    detail: { req_code: reqCode, notarize: !!action.notarize, draft: signable },
  })
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/documents")
  return { ok: true, documentId, needsSignature: signable }
}

/**
 * Sign the draft: re-render the SAME answers with the signature and the signing
 * timestamp stamped in, overwrite the draft bytes, log the signing act, and only
 * then let the requirement complete.
 *
 * `base64Png` is a freshly captured signature; omit it to use the one on file.
 * Either way the signing act is recorded against these exact bytes — the image
 * is reusable, the act is not.
 */
export async function signRequirementDocument(
  reqCode: string,
  base64Png?: string
): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }

  const action = actionFor(reqCode)
  if (!action || !isSignable(action)) return { error: "That requirement isn't signed here." }

  const supabase = await createClient()

  // A new signature replaces the one on file (the applicant chose "re-sign").
  if (base64Png) {
    if (!isReasonableSignature(base64Png)) return { error: "Please draw or type your signature first." }
    const { error } = await supabase
      .from("signatures")
      .upsert(
        { case_id: myCase.id, signer_key: "applicant", png_base64: base64Png, consent_text: SIGNING_CONSENT },
        { onConflict: "case_id,signer_key" }
      )
    if (error) return { error: error.message }
  }

  const [signaturePng, { data: saved }, { data: draft }] = await Promise.all([
    getSignaturePng(supabase, myCase.id, "applicant"),
    supabase.from("requirement_answers").select("answers").eq("case_id", myCase.id).eq("req_code", reqCode).maybeSingle(),
    supabase
      .from("documents")
      .select("id, file_path, signed_at")
      .eq("case_id", myCase.id)
      .eq("req_code", reqCode)
      .eq("generated", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (!signaturePng) return { error: "Add your signature first, then sign." }
  if (!draft?.file_path) return { error: "Generate the document first, then sign it." }
  if (draft.signed_at) return { error: "This document is already signed. Regenerate it if you need to change something." }

  const signedAt = new Date()
  try {
    const doc = await renderRequirementDocument({
      reqCode,
      applicantName: myCase.client.full_name,
      answers: (saved?.answers ?? {}) as Record<string, unknown>,
      signaturePng,
      signedAt,
    })

    const admin = createAdminClient()
    await markGeneratedDocumentSigned(admin, {
      documentId: draft.id,
      filePath: draft.file_path,
      bytes: doc.bytes,
      signedAt,
    })

    // Binds this signer to THESE bytes (SHA-256), with when, from where, and
    // what they consented to. Without it the PNG is just a reusable image.
    const h = await headers()
    await recordSignatureEvent(admin, {
      caseId: myCase.id,
      signerKey: "applicant",
      documentId: draft.id,
      reqCode,
      bytes: doc.bytes,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    })

    if (action.notarize) {
      await admin
        .from("case_requirements")
        .update({
          document_id: draft.id,
          notes: "Signed — have it notarized, then upload the signed copy to complete this.",
        })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending"])
    } else {
      await admin
        .from("case_requirements")
        .update({ status: "satisfied", document_id: draft.id, notes: "Signed on platform." })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending", "na"])
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign the document" }
  }

  await logActivity({
    action: "requirement.document_signed",
    caseId: myCase.id,
    entity: "document",
    entityId: draft.id,
    detail: { req_code: reqCode, notarize: !!action.notarize },
  })
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/documents")
  return { ok: true, documentId: draft.id }
}

/** The prepared letter that helps OBTAIN an external document (ARR-01 court request). */
export async function generateCompanionDocument(reqCode: string): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  const act = actionFor(reqCode)
  if (act?.mode !== "generate" || !act.companion) {
    return { error: "No companion document for that requirement." }
  }

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
