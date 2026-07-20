"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { getMyCase } from "@/lib/portal"
import { getSignaturePng, isReasonableSignature } from "@/lib/signatures"
import { actionFor, isSignable } from "@/lib/requirements/actions"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { toUserFacingError } from "@/lib/schema-health"
import { peopleFromAnswers, livesAlone, syncReferences, syncCohabitants } from "@/lib/requirements/roster"
import { recomputeReferenceRequirement } from "@/lib/references/process"
import { recomputeCohabitantRequirement } from "@/lib/cohabitants/process"
import { computeFeeSummary } from "@/lib/fees"
import { renderFeeSheet } from "@/lib/pdf/fee-sheet"
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

export interface RosterResult extends Result {
  /** Human-readable summary of what the submission actually did. */
  summary?: string
  /** People with no email — the applicant sends them the link themselves. */
  needEmail?: string[]
}

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
  // A cohabitants roster reaches here only for the sole-occupancy statement —
  // the one document in that flow the applicant signs themselves.
  const generates = action?.mode === "generate" || (action?.mode === "roster" && action.roster === "cohabitants")
  if (!action || !generates) return { error: "That requirement isn't generated on-platform." }
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
      caseRef: myCase.id.slice(0, 8),
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
      // Waiting on a notary is a stage of its own, and the customer can see it.
      await maybeAdvanceStage(admin, myCase.id, "notarization", "requirement.notarized_document_generated")
    } else {
      await admin
        .from("case_requirements")
        .update({ status: "satisfied", document_id: documentId, notes: "Completed on platform." })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending", "na"])
    }
  } catch (e) {
    // A database behind the deployed code surfaces here as a raw PostgREST
    // "column not found in the schema cache" — our deployment mistake, told to
    // the applicant as if they'd done something wrong. Translate it.
    return { error: toUserFacingError(e, "Could not generate the document") }
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
 * ROSTER requirements (COH-01, REF-01/02): the documents are written and
 * notarized by other people, so "completing" this means naming them and getting
 * each of them their own private link — not producing a PDF. Routing these
 * through the generator is what produced "No generator for COH-01".
 *
 * The one exception is living alone: then COH-01 becomes the applicant's own
 * sole-occupancy statement, which follows the normal generate → sign → notarize
 * path.
 *
 * Submitting the list NEVER satisfies the requirement. Only notarized copies
 * coming back do.
 */
export async function submitRequirementRoster(
  reqCode: string,
  answers: Record<string, unknown>
): Promise<RosterResult> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }

  const action = actionFor(reqCode)
  if (action?.mode !== "roster") return { error: "That requirement isn't a list of people." }

  // Keep the answers so re-opening the questionnaire shows what they entered.
  const supabase = await createClient()
  await supabase.from("requirement_answers").upsert(
    { case_id: myCase.id, req_code: reqCode, answers: answers as never, completed_at: new Date().toISOString() },
    { onConflict: "case_id,req_code" }
  )

  // Service role: creating people rows + minting capability tokens on tables the
  // client may not arbitrarily write. Ownership proven by getMyCase above.
  const admin = createAdminClient()

  try {
    if (action.roster === "cohabitants" && livesAlone(answers)) {
      // Living alone → their OWN statement, signed then notarized. Any household
      // rows from a previous answer that carry no evidence are cleared, so the
      // case doesn't claim both "I live alone" and a roster of housemates.
      await syncCohabitants(admin, myCase.id, [])
      const gen = await generateRequirementDocument(reqCode)
      if (gen.error) return gen
      return {
        ok: true,
        documentId: gen.documentId,
        needsSignature: gen.needsSignature,
        summary: "We prepared your sole-occupancy statement. Sign it, then have it notarized and upload the signed copy.",
      }
    }

    const people = peopleFromAnswers(answers, action.roster)
    if (people.length === 0) {
      return { error: "Add at least one person, or tell us you live alone." }
    }

    const sync =
      action.roster === "references"
        ? await syncReferences(admin, myCase.id, people)
        : await syncCohabitants(admin, myCase.id, people)

    // Recompute from evidence — never from the fact that a list was submitted.
    if (action.roster === "references") await recomputeReferenceRequirement(admin, myCase.id)
    else await recomputeCohabitantRequirement(admin, myCase.id)

    await logActivity({
      action: "requirement.roster_submitted",
      caseId: myCase.id,
      entity: "case_requirement",
      detail: { req_code: reqCode, ...sync },
    })
    revalidatePath("/portal/checklist")
    revalidatePath("/portal/documents")
    revalidatePath("/portal/people")

    const noun = action.roster === "references" ? "reference" : "household member"
    const parts: string[] = []
    if (sync.invited > 0) parts.push(`Sent ${sync.invited} private link${sync.invited === 1 ? "" : "s"} by email.`)
    if (sync.needEmail.length > 0) {
      parts.push(
        `${sync.needEmail.length} ${noun}${sync.needEmail.length === 1 ? "" : "s"} (${sync.needEmail.join(", ")}) ${
          sync.needEmail.length === 1 ? "has" : "have"
        } no email — copy their link from References & household and send it yourself.`
      )
    }
    if (sync.sendFailed.length > 0) {
      // Had an address but delivery didn't go through — never claim "sent".
      parts.push(
        `We couldn't email ${sync.sendFailed.join(", ")} just now — their link is ready to copy from References & household in the meantime.`
      )
    }
    if (sync.keptWithEvidence.length > 0) {
      // "Evidence" here means received OR notarized — don't claim notarized when
      // we only have a submitted letter.
      parts.push(
        `Kept ${sync.keptWithEvidence.join(", ")} — we already have their document on file, so removing them from the list wouldn't remove it.`
      )
    }
    parts.push("This completes when the notarized copies come back.")

    return { ok: true, summary: parts.join(" "), needEmail: sync.needEmail }
  } catch (e) {
    return { error: toUserFacingError(e, "Could not set up those invitations") }
  }
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
      caseRef: myCase.id.slice(0, 8),
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
      await maybeAdvanceStage(admin, myCase.id, "notarization", "requirement.notarized_document_signed")
    } else {
      await admin
        .from("case_requirements")
        .update({ status: "satisfied", document_id: draft.id, notes: "Signed on platform." })
        .eq("case_id", myCase.id)
        .eq("req_code", reqCode)
        .in("status", ["pending", "na"])
    }
  } catch (e) {
    return { error: toUserFacingError(e, "Could not sign the document") }
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
      caseRef: myCase.id.slice(0, 8),
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
    return { error: toUserFacingError(e, "Could not generate the letter") }
  }
}

/**
 * FEE-01: record that the applicant understands what they'll owe, to whom, and
 * that it's non-refundable — and what payment method they intend to use.
 *
 * WE NEVER TAKE THESE FEES. This is an acknowledgement, not a payment step: the
 * NYPD application fee is paid on the NYPD portal and the fingerprint fee to the
 * vendor at the appointment. Recording what was acknowledged (and the amounts
 * shown at the time) is what makes this meaningful for the audit trail later.
 */
export async function acknowledgeFees(
  reqCode: string,
  input: { method?: "card" | "money_order" }
): Promise<Result> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  const action = actionFor(reqCode)
  if (action?.mode !== "attest" || action.panel !== "fees") {
    return { error: "That requirement isn't the fee step." }
  }

  const supabase = await createClient()
  const kase = await supabase.from("cases").select("is_renewal").eq("id", myCase.id).maybeSingle()
  const intake = await supabase
    .from("intake_sessions")
    .select("answers")
    .eq("case_id", myCase.id)
    .maybeSingle()
  const answers = (intake.data?.answers ?? {}) as { isRetiredLeo?: boolean }

  // Snapshot the amounts they were actually shown — a later fee change must not
  // rewrite what this person acknowledged.
  const summary = await computeFeeSummary(supabase, {
    isRetiredLeo: answers.isRetiredLeo,
    isRenewal: kase.data?.is_renewal,
  })

  const acknowledgement = {
    acknowledgedAt: new Date().toISOString(),
    method: input.method ?? null,
    understoodNonRefundable: true,
    paidDirectlyToAgencies: true,
    amountsShown: summary.items.map((i) => ({ key: i.key, amount: i.amount, payTo: i.payTo, waived: !!i.waived })),
    totalShown: summary.total,
  }

  await supabase.from("requirement_answers").upsert(
    { case_id: myCase.id, req_code: reqCode, answers: acknowledgement as never, completed_at: new Date().toISOString() },
    { onConflict: "case_id,req_code" }
  )

  const admin = createAdminClient()
  const { error } = await admin
    .from("case_requirements")
    .update({
      status: "satisfied",
      notes: `Applicant confirmed fee readiness (${summary.total} owed directly to the agencies${
        input.method ? `, paying by ${input.method === "card" ? "card" : "money order"}` : ""
      }).`,
    })
    .eq("case_id", myCase.id)
    .eq("req_code", reqCode)
    .in("status", ["pending"])
  if (error) return { error: error.message }

  await logActivity({
    action: "requirement.fees_acknowledged",
    caseId: myCase.id,
    entity: "case_requirement",
    detail: { req_code: reqCode, method: input.method ?? null, total: summary.total },
  })
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/documents")
  return { ok: true }
}

/**
 * The printable "Your fees & how to pay them" sheet — the one to take to the
 * fingerprint appointment, where the fee is due in person.
 */
export async function generateFeeSheet(): Promise<Result & { url?: string }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }

  const supabase = await createClient()
  const [{ data: kase }, { data: intake }] = await Promise.all([
    supabase.from("cases").select("is_renewal").eq("id", myCase.id).maybeSingle(),
    supabase.from("intake_sessions").select("answers").eq("case_id", myCase.id).maybeSingle(),
  ])
  const answers = (intake?.answers ?? {}) as { isRetiredLeo?: boolean }

  try {
    const summary = await computeFeeSummary(supabase, {
      isRetiredLeo: answers.isRetiredLeo,
      isRenewal: kase?.is_renewal,
    })
    const bytes = await renderFeeSheet({
      applicantName: myCase.client.full_name,
      caseRef: myCase.id.slice(0, 8),
      summary,
    })

    // Service role: server-derived provenance on a staff-reviewed table.
    const admin = createAdminClient()
    const documentId = await storeGeneratedDocument(admin, {
      caseId: myCase.id,
      clientId: myCase.client.id,
      reqCode: "FEE-01",
      doc: {
        bytes,
        fileName: "fee-sheet.pdf",
        documentType: "fee_sheet",
        label: "Your fees & how to pay them",
      },
    })

    const { data: doc } = await admin.from("documents").select("file_path").eq("id", documentId).single()
    let url: string | null = null
    if (doc?.file_path) {
      const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600)
      url = data?.signedUrl ?? null
    }

    await logActivity({
      action: "requirement.fee_sheet_generated",
      caseId: myCase.id,
      entity: "document",
      entityId: documentId,
      detail: { total: summary.total },
    })
    revalidatePath("/portal/documents")
    return { ok: true, documentId, url: url ?? undefined }
  } catch (e) {
    return { error: toUserFacingError(e, "Could not prepare your fee sheet") }
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
