"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { authorizeCaseActor } from "@/lib/case-actor"
import { fillTemplate, signTemplate, rawTemplate } from "@/lib/forms/fill"
import { formTemplate } from "@/lib/forms/templates"
import { resolveFacts } from "@/lib/facts/resolve"
import { assembleApplicationValues } from "@/lib/forms/prepare"
import { rematerializeCase } from "@/lib/requirements/rematerialize"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { sendEmail } from "@/lib/email"
import { brand } from "@/config/brand"
import { getMyCase } from "@/lib/portal"
import { getSignaturePng, isReasonableSignature } from "@/lib/signatures"
import { actionFor, isSignable } from "@/lib/requirements/actions"
import { questionnaireFor, type Field } from "@/lib/requirements/questionnaires"
import { factDef } from "@/lib/facts/registry"
import { setCaseSsn, getCaseSsn, ssnConfigured } from "@/lib/facts/ssn"
import { maybeAdvanceStage } from "@/lib/cases/advance"
import { inviteSafeguard, loadSafeguardInvite } from "@/lib/safeguard/invite"
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

type Result = { error?: string; ok?: boolean; documentId?: string; needsSignature?: boolean; incomplete?: string[] }

export interface RosterResult extends Result {
  /** Human-readable summary of what the submission actually did. */
  summary?: string
  /** People with no email — the applicant sends them the link themselves. */
  needEmail?: string[]
}

/** Save (or update) a requirement's questionnaire answers. Client-owned via RLS. */
export async function saveRequirementAnswers(
  reqCode: string,
  answers: Record<string, unknown>,
  /** Sponsor parity: a full-scope rep passes the case they're drafting for. Omitted
   *  by the applicant (derived from their own case). */
  caseId?: string
): Promise<Result> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "No case found" }
  if (!actionFor(reqCode)) return { error: "Unknown requirement" }

  // Co-authored documents (the Letter of Necessity): on a sponsored case the actor may
  // write ONLY their own party's fields, so an applicant save can't wipe the employer's
  // business-knowledge statements (1/3/5) and a sponsor save can't touch the applicant's
  // acknowledgements (2/4/6). No-op on a non-sponsored case (the applicant owns all).
  const answersToSave = await applyPartyOwnership(actor, reqCode, answers)

  const { error } = await actor.db
    .from("requirement_answers")
    .upsert(
      {
        case_id: actor.caseId,
        req_code: reqCode,
        answers: answersToSave as never,
        completed_at: new Date().toISOString(),
        // Attribution: who prepared this draft. A sworn document is still not
        // final until the APPLICANT signs it (adoption), regardless of who drafted.
        drafted_by: actor.profileId,
      },
      { onConflict: "case_id,req_code" }
    )
  if (error) return { error: error.message }

  // Propagate fact-backed fields to case_facts — entered once, reused everywhere.
  // Derived facts are read-only; the SSN is handled at fill time (encrypted store).
  await propagateFacts(actor, reqCode, answers)

  // A saved disclosure changes what the application requires: a "yes" to a Section B
  // question must spawn the PD 643-041A addendum and the matching statement
  // requirement (arrest, order of protection, domestic incident, name change) in THIS
  // request — not only if the applicant once passed through the wizard. Re-materialize
  // from the canonical stores whenever the Section B answers change.
  if (reqCode === "DSC-01" || reqCode === "QUE-01") {
    await rematerializeCase(createAdminClient(), actor.caseId)
    revalidatePath("/portal/concierge")
  }

  revalidatePath("/portal/checklist")
  return { ok: true }
}

/**
 * Enforce field-level party ownership on a co-authored document (the Letter of
 * Necessity). On a SPONSORED case the incoming save keeps only the fields the ACTOR's
 * party owns; every other-party field falls back to what's already stored — so the two
 * authors (employer: statements 1/3/5; applicant: 2/4/6) can never overwrite each
 * other. Untagged fields and non-sponsored cases pass through unchanged.
 */
async function applyPartyOwnership(
  actor: { caseId: string; actor: string },
  reqCode: string,
  answers: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const act = actionFor(reqCode)
  const qid = act && (act.mode === "generate" || act.mode === "roster") ? act.questionnaireId : null
  const q = qid ? questionnaireFor(qid) : null
  const partyFields = (q?.fields ?? []).filter((f) => f.party)
  if (partyFields.length === 0) return answers // not a co-authored document

  const admin = createAdminClient()
  const { data: sponsorship } = await admin
    .from("case_sponsorships")
    .select("id")
    .eq("case_id", actor.caseId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle()
  if (!sponsorship) return answers // not sponsored — the applicant owns everything

  const actorParty = actor.actor === "sponsor" ? "sponsor" : "applicant"
  const { data: existingRow } = await admin
    .from("requirement_answers")
    .select("answers")
    .eq("case_id", actor.caseId)
    .eq("req_code", reqCode)
    .maybeSingle()
  const existing = (existingRow?.answers ?? {}) as Record<string, unknown>

  const merged = { ...answers }
  for (const f of partyFields) {
    // A field the actor does NOT own: preserve the stored value, ignore the incoming one.
    if (f.party !== actorParty) merged[f.name] = existing[f.name]
  }
  return merged
}

/** Write a questionnaire's fact-backed answers to the shared case_facts. */
async function propagateFacts(
  actor: { caseId: string; profileId: string; actor: string },
  reqCode: string,
  answers: Record<string, unknown>
) {
  const act = actionFor(reqCode)
  const qid = act && (act.mode === "generate" || act.mode === "roster") ? act.questionnaireId : null
  const q = qid ? questionnaireFor(qid) : null
  if (!q) return
  const rows: { case_id: string; key: string; value: string; sensitive: boolean; source: string; updated_by: string; override_req_code: string }[] = []
  const collect = (fields?: Field[]) => {
    for (const f of fields ?? []) {
      if (!f.fact || f.fact === "applicant.ssn") continue
      const def = factDef(f.fact)
      if (!def || def.derive) continue // derived facts are read-only
      if (!(f.name in answers)) continue
      const v = answers[f.name]
      if (v == null || v === "") continue
      rows.push({ case_id: actor.caseId, key: f.fact, value: String(v), sensitive: !!def.sensitive, source: actor.actor, updated_by: actor.profileId, override_req_code: "" })
    }
  }
  collect(q.fields)
  for (const g of q.groups ?? []) collect(g.fields)
  if (rows.length) {
    await createAdminClient().from("case_facts").upsert(rows, { onConflict: "case_id,key,override_req_code" })
  }
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
export async function generateRequirementDocument(
  reqCode: string,
  caseId?: string,
  /** Transient values (e.g. SSN) filled into the PDF but NEVER persisted — see the
   *  SSN decision. Merged at fill time only. */
  ephemeral?: Record<string, unknown>
): Promise<Result> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "No case found" }

  const action = actionFor(reqCode)
  // A cohabitants roster reaches here only for the sole-occupancy statement —
  // the one document in that flow the applicant signs themselves.
  const generates = action?.mode === "generate" || (action?.mode === "roster" && action.roster === "cohabitants")
  if (!action || !generates) return { error: "That requirement isn't generated on-platform." }
  const signable = isSignable(action)

  // Admin for the answers read + generated-document provenance (works for both
  // the owner and a full-scope sponsor, who has no direct table grants). The
  // ACTOR was authorized above.
  const admin = createAdminClient()
  const { data: saved } = await admin
    .from("requirement_answers")
    .select("answers")
    .eq("case_id", actor.caseId)
    .eq("req_code", reqCode)
    .maybeSingle()
  const answers = (saved?.answers ?? {}) as Record<string, unknown>

  let documentId: string
  let incompleteFields: string[] = []
  try {
    // No signedAt ⇒ the renderer produces the DRAFT rendering. A signature image
    // on file is deliberately NOT applied here: signing is an act the APPLICANT
    // performs on specific bytes — never something a sponsor (or a reused stamp)
    // can do. This is the draft/adopt line: anyone with write access may DRAFT;
    // only the applicant ADOPTS by signing.
    if (action.mode === "generate" && action.templateKey) {
      // COMPLETE: fill the REAL official PDF (never a facsimile).
      // SSN: only an APPLICANT-triggered fill ever handles it. Provided ⇒ stored
      // encrypted (case_ssn) and used; not provided ⇒ fetched from the encrypted
      // store (logged). A SPONSOR fill never sets or reads the SSN.
      let fillValues: Record<string, unknown> = { ...answers }
      if (actor.actor === "client") {
        const { ssn: providedSsn, ...restEphemeral } = ephemeral ?? {}
        fillValues = { ...fillValues, ...restEphemeral }
        if (formTemplate(action.templateKey)?.ephemeral?.includes("ssn")) {
          const provided = providedSsn != null ? String(providedSsn).trim() : ""
          if (provided) {
            await setCaseSsn(admin, actor.caseId, provided, actor.profileId)
            fillValues.ssn = provided
          } else if (ssnConfigured()) {
            fillValues.ssn = (await getCaseSsn(admin, actor.caseId, `fill ${reqCode}`)) ?? ""
          }
        }
      }
      // §5-09 — the PLE-01 instructor block is collected in-platform from the
      // ASSIGNED instructor (prelicense_instructor_statements), never authored by
      // the applicant. Merge it into the fill so the official form carries the
      // verified statement; the completeness gate flags it if it isn't in yet.
      if (action.templateKey === "nypd_prelicense_exemption") {
        const { data: st } = await admin
          .from("prelicense_instructor_statements")
          .select("met_applicant, no_danger, credentials, instructor_name, instructor_address, instructor_phone, range_name, training_location")
          .eq("case_id", actor.caseId)
          .maybeSingle()
        if (st) {
          fillValues = {
            ...fillValues,
            instructorName: st.instructor_name ?? "",
            instructorCredentials: st.credentials ?? "",
            instructorRangeName: st.range_name ?? "",
            instructorAddress: st.instructor_address ?? "",
            instructorPhone: st.instructor_phone ?? "",
            trainingLocation: st.training_location ?? "",
            metApplicant: !!st.met_applicant,
            noDanger: !!st.no_danger,
          }
        }
      }
      // The licence track scopes the Letter of Necessity (which statements are asked,
      // required and printed). Inject it so the template gates on the same source the
      // questionnaire does.
      const { data: trackRow } = await admin.from("cases").select("license_track").eq("id", actor.caseId).maybeSingle()
      fillValues = { ...fillValues, licenseTrack: trackRow?.license_track ?? "" }

      const filled = await fillTemplate(action.templateKey, fillValues)
      incompleteFields = filled.missingRequired
      // Part F2 — a REQUIRED value is empty. A partially filled government form must
      // NEVER present as done: do not store it, do not return a document. Hand back
      // the missing list so the applicant is told exactly what to enter and where.
      // (Applies to every template-based generate, not just the Letter of Necessity.)
      if (incompleteFields.length) {
        return { incomplete: incompleteFields }
      }
      // Phase 4 — fill failures are LOUD. A field that didn't land is a mapping
      // bug: fail fast off-prod; in prod, complete the fill but flag it for review
      // and raise a task so a partially-filled government form never presents as done.
      if (filled.missing.length && process.env.NODE_ENV !== "production") {
        throw new Error(`Fill mapping error on ${action.templateKey}: unresolved fields → ${filled.missing.join(", ")}`)
      }
      documentId = await storeGeneratedDocument(admin, {
        caseId: actor.caseId,
        clientId: actor.clientId,
        reqCode,
        doc: {
          bytes: filled.bytes,
          fileName: `${action.templateKey}.pdf`,
          documentType: action.documentType as never,
          label: filled.template.officialTitle,
        },
        templateKey: action.templateKey,
        templateSha256: filled.sha256,
      })
      if (filled.missing.length) {
        await admin
          .from("documents")
          .update({ review_notes: `Auto-fill could not place: ${filled.missing.join(", ")}. Review before use.` })
          .eq("id", documentId)
        await admin.from("tasks").insert({
          case_id: actor.caseId,
          title: `Form fill incomplete: ${reqCode}`,
          description: `Fields not placed on ${action.templateKey}: ${filled.missing.join(", ")}. The document is flagged for review.`,
          priority: 1,
          status: "open",
        })
      }
      // Completeness gate — a required value is empty. The doc is NOT ready to
      // sign; record which values are outstanding so the applicant is told exactly.
      if (incompleteFields.length) {
        await admin
          .from("documents")
          .update({ review_notes: `Not ready to sign — still needs: ${incompleteFields.join(", ")}.` })
          .eq("id", documentId)
      }
      // Fill summary to the activity trail — answers "was this form complete when
      // he signed it?" months later.
      await logActivity({
        action: "form.template_filled",
        caseId: actor.caseId,
        entity: "document",
        entityId: documentId,
        detail: { templateKey: action.templateKey, sha256: filled.sha256, ...filled.summary, missing: filled.missing, missingRequired: incompleteFields },
      })
    } else {
      // DSC-01's document is the signed answers + authorization record — it needs the
      // full assembled application data (facts + intake + disclosures + letter of
      // necessity), not just the requirement's own answers.
      const record = reqCode === "DSC-01" ? (await assembleApplicationValues(admin, actor.caseId))?.values : undefined
      const doc = await renderRequirementDocument({
        reqCode,
        applicantName: actor.clientName,
        answers,
        caseRef: actor.caseId.slice(0, 8),
        record,
      })
      documentId = await storeGeneratedDocument(admin, {
        caseId: actor.caseId,
        clientId: actor.clientId,
        reqCode,
        doc,
      })
    }

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
        .eq("case_id", actor.caseId)
        .eq("req_code", reqCode)
        .in("status", ["pending", "satisfied", "na"])
    } else if (action.notarize) {
      await admin
        .from("case_requirements")
        .update({
          document_id: documentId,
          notes: "Generated — have it notarized, then upload the signed copy to complete this.",
        })
        .eq("case_id", actor.caseId)
        .eq("req_code", reqCode)
        .in("status", ["pending"])
      // Waiting on a notary is a stage of its own, and the customer can see it.
      await maybeAdvanceStage(admin, actor.caseId, "notarization", "requirement.notarized_document_generated")
    } else {
      await admin
        .from("case_requirements")
        .update({ status: "satisfied", document_id: documentId, notes: "Completed on platform." })
        .eq("case_id", actor.caseId)
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
    caseId: actor.caseId,
    entity: "document",
    entityId: documentId,
    detail: { req_code: reqCode, notarize: !!action.notarize, draft: signable },
  })
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/documents")
  // Never route to signing an incomplete form — the caller shows what's missing.
  return { ok: true, documentId, needsSignature: signable && incompleteFields.length === 0, incomplete: incompleteFields.length ? incompleteFields : undefined }
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
  answers: Record<string, unknown>,
  /** Sponsor parity: a full-scope rep passes the case; the applicant omits it. */
  caseId?: string
): Promise<RosterResult> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "No case found" }

  const action = actionFor(reqCode)
  if (action?.mode !== "roster") return { error: "That requirement isn't a list of people." }

  // Keep the answers so re-opening the questionnaire shows what they entered.
  await actor.db.from("requirement_answers").upsert(
    {
      case_id: actor.caseId,
      req_code: reqCode,
      answers: answers as never,
      completed_at: new Date().toISOString(),
      drafted_by: actor.profileId,
    },
    { onConflict: "case_id,req_code" }
  )

  // Service role: creating people rows + minting capability tokens on tables the
  // client may not arbitrarily write. The ACTOR was authorized above.
  const admin = createAdminClient()

  try {
    if (action.roster === "cohabitants" && livesAlone(answers)) {
      // Living alone → their OWN statement, signed then notarized. Any household
      // rows from a previous answer that carry no evidence are cleared, so the
      // case doesn't claim both "I live alone" and a roster of housemates.
      await syncCohabitants(admin, actor.caseId, [])
      const gen = await generateRequirementDocument(reqCode, actor.caseId)
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

    // NYPD rule: at least TWO character references must not be related to you.
    // So the family cap is (required count − 2): carry (4) → up to 2 family;
    // premises (2) → none. Block before we invite anyone.
    if (action.roster === "references") {
      const refs = Array.isArray(answers.references) ? (answers.references as { isFamily?: string }[]) : []
      const familyCount = refs.filter((r) => r?.isFamily === "yes").length
      const maxFamily = Math.max(0, (action.minimum ?? 4) - 2)
      if (familyCount > maxFamily) {
        return {
          error:
            maxFamily === 0
              ? "None of your references can be family — the NYPD requires that all be people not related to you."
              : `At least two of your references must not be family, so at most ${maxFamily} can be a family member. You've marked ${familyCount} as family — please change one.`,
        }
      }
    }

    const sync =
      action.roster === "references"
        ? await syncReferences(admin, actor.caseId, people)
        : await syncCohabitants(admin, actor.caseId, people)

    // Recompute from evidence — never from the fact that a list was submitted.
    if (action.roster === "references") await recomputeReferenceRequirement(admin, actor.caseId)
    else await recomputeCohabitantRequirement(admin, actor.caseId)

    await logActivity({
      action: "requirement.roster_submitted",
      caseId: actor.caseId,
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
  const admin = createAdminClient()
  try {
    let signedBytes: Uint8Array
    if (action.mode === "generate" && action.templateKey) {
      // Adopt onto the REAL official PDF: overlay the applicant's signature on the
      // form's own signature field. Operates on the stored draft bytes so the
      // transient SSN already rendered into the draft isn't recollected.
      const { data: blob } = await admin.storage.from("documents").download(draft.file_path)
      if (!blob) return { error: "Couldn't open the draft to sign." }
      const filled = await signTemplate(new Uint8Array(await blob.arrayBuffer()), action.templateKey, signaturePng, signedAt)
      signedBytes = filled.bytes
    } else {
      const record = reqCode === "DSC-01" ? (await assembleApplicationValues(admin, myCase.id))?.values : undefined
      const doc = await renderRequirementDocument({
        reqCode,
        applicantName: myCase.client.full_name,
        answers: (saved?.answers ?? {}) as Record<string, unknown>,
        signaturePng,
        signedAt,
        caseRef: myCase.id.slice(0, 8),
        record,
      })
      signedBytes = doc.bytes
    }

    await markGeneratedDocumentSigned(admin, {
      documentId: draft.id,
      filePath: draft.file_path,
      bytes: signedBytes,
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
      bytes: signedBytes,
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
 * NYPD application fee is paid on the NYPD portal and the fingerprint fee in
 * person to the NYPD License Division at the appointment it schedules. Recording
 * what was acknowledged (and the amounts shown at the time) makes this
 * meaningful for the audit trail later.
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
      const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300)
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

/**
 * PHASE 4 — pre-prepare the investigation-phase forms (employment authorization,
 * HIPAA medical release). These are NOT packet requirements; the investigator may
 * request them after filing, so we fill the official forms with the applicant's
 * identity ahead of time. SSN is left BLANK to write in by hand (PII minimisation).
 * Either the applicant or a full-scope sponsor may trigger it. Idempotent.
 */
export async function prepareInvestigationForms(
  caseId?: string
): Promise<{ forms?: { name: string; url: string }[]; error?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "No case found" }

  const admin = createAdminClient()
  const f = await resolveFacts(admin, actor.caseId)
  const vals = { fullName: f["applicant.fullName"] || actor.clientName, address: f["applicant.fullAddress"], dob: f["applicant.dob"] }

  // The employment form is fillable; the HIPAA release is encrypted (no fields for
  // pdf-lib) so we hand over the blank official PDF to complete by hand.
  const specs = [
    { key: "nypd_employment_record_request", type: "employment_authorization" as const, file: "employment-record-request.pdf", label: "Employment record request", fill: true },
    { key: "nypd_hipaa_release", type: "hipaa_release" as const, file: "hipaa-medical-release.pdf", label: "HIPAA medical release (blank — complete by hand)", fill: false },
  ]

  // Clear any prior copies so re-preparing doesn't pile up duplicates.
  await admin
    .from("documents")
    .delete()
    .eq("case_id", actor.caseId)
    .in("template_key", specs.map((sp) => sp.key))

  const out: { name: string; url: string }[] = []
  for (const spec of specs) {
    // SSN intentionally omitted → blank on the form (write by hand).
    const doc = spec.fill ? await fillTemplate(spec.key, vals) : rawTemplate(spec.key)
    if (!doc) continue
    const id = crypto.randomUUID()
    const path = `clients/${actor.clientId}/${id}/${spec.file}`
    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(path, Buffer.from(doc.bytes), { contentType: "application/pdf", upsert: true })
    if (upErr) continue
    await admin.from("documents").insert({
      id,
      case_id: actor.caseId,
      client_id: actor.clientId,
      type: spec.type,
      file_name: spec.file,
      file_path: path,
      status: "pending",
      generated: true,
      template_key: spec.key,
      template_sha256: doc.sha256,
    })
    const { data: signed } = await admin.storage.from("documents").createSignedUrl(path, 300)
    if (signed?.signedUrl) out.push({ name: spec.label, url: signed.signedUrl })
  }

  await logActivity({
    action: "investigation.forms_prepared",
    caseId: actor.caseId,
    entity: "case",
    entityId: actor.caseId,
    detail: { count: out.length },
  })
  return { forms: out }
}


/**
 * "Find me an instructor" (TRN-01) — email the case team a training request, log it,
 * and confirm in place. Idempotent-ish: a request in the last 7 days short-circuits so
 * nobody fires five emails.
 */
export async function requestTrainingInstructor(): Promise<{ ok?: true; error?: string; alreadySent?: boolean }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  const admin = createAdminClient()

  const { data: recent } = await admin
    .from("activity_log")
    .select("created_at")
    .eq("case_id", myCase.id)
    .eq("action", "training.instructor_requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 7 * 86400 * 1000) {
    return { alreadySent: true }
  }

  const { data: kase } = await admin.from("cases").select("license_track").eq("id", myCase.id).maybeSingle()
  const trainingLines = [
    `Name: ${myCase.client.full_name}`,
    `Account email: ${myCase.client.email ?? "—"}`,
    `Case reference: ${myCase.id.slice(0, 8)}`,
    `Licence track: ${kase?.license_track ?? "—"}`,
    `Requested: ${new Date().toISOString()}`,
  ]
  await sendEmail({
    to: brand.contact.email,
    subject: `Training request — ${myCase.client.full_name}`,
    text: trainingLines.join("\n"),
    html: trainingLines.map((l) => `<p>${l}</p>`).join(""),
  })
  await logActivity({ action: "training.instructor_requested", caseId: myCase.id, entity: "case", entityId: myCase.id })
  return { ok: true }
}

/**
 * "Request help" on the DMV abstract (DMV-01) — CONCIERGE ONLY. Opens a request to the
 * case team so they can walk the applicant through the lifetime-abstract gotchas.
 */
export async function requestDmvHelp(): Promise<{ ok?: true; error?: string }> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found" }
  if (myCase.service_mode !== "concierge") return { error: "This is a concierge service." }

  const dmvLines = [
    `Name: ${myCase.client.full_name}`,
    `Account email: ${myCase.client.email ?? "—"}`,
    `Case reference: ${myCase.id.slice(0, 8)}`,
    `Requested help with the lifetime driving abstract on ${new Date().toISOString()}`,
  ]
  await sendEmail({
    to: brand.contact.email,
    subject: `DMV abstract help — ${myCase.client.full_name}`,
    text: dmvLines.join("\n"),
    html: dmvLines.map((l) => `<p>${l}</p>`).join(""),
  })
  await logActivity({ action: "dmv.help_requested", caseId: myCase.id, entity: "case", entityId: myCase.id })
  return { ok: true }
}

/**
 * SFG-01 — send the safeguard person a tokenized link to complete, sign (witnessed)
 * and upload NYPD's Acknowledgement themselves, like the reference/cohabitant flows.
 * Their email comes from the safeguard facts (entered on Your details).
 */
export async function sendSafeguardInvite(
  caseId?: string
): Promise<{ ok?: boolean; error?: string; token?: string; emailed?: boolean; email?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "No case found." }
  const admin = createAdminClient()
  const f = await resolveFacts(admin, actor.caseId)
  const email = (f["safeguard.email"] ?? "").trim()
  if (!email) {
    return { error: "Add the safeguard person's email on Your details first, then send them the link." }
  }
  const res = await inviteSafeguard(admin, actor.caseId, email)
  if (!res) return { error: "Couldn't send the link. Please try again." }
  await logActivity({
    action: "safeguard.invite_sent",
    caseId: actor.caseId,
    entity: "case",
    entityId: actor.caseId,
    detail: { emailed: res.emailed },
  })
  const invite = await loadSafeguardInvite(admin, actor.caseId)
  revalidatePath("/portal/checklist")
  revalidatePath("/portal/concierge")
  return { ok: true, token: invite?.token ?? undefined, emailed: res.emailed, email }
}
