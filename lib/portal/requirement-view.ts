/**
 * ONE loader behind both customer views.
 *
 * /portal/checklist and /portal/documents used to be built from different
 * lists — the requirements engine on one side, a hardcoded set of upload slots
 * on the other — so they disagreed about what was still outstanding, which is
 * exactly the confusion this fixes. Both pages now read this.
 *
 * Checklist = the journey (what's left, in order). Documents = the file library.
 * Same data, two questions.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { MyCase } from "@/lib/portal"
import { getCaseRequirements } from "@/lib/requirements"
import { actionFor } from "@/lib/requirements/actions"
import { questionnaireFor, prefillFor, type PrefillContext } from "@/lib/requirements/questionnaires"
import { formatLegalAddress, type WizardAnswers } from "@/lib/intake/answers"
import type { GeneratedDoc, ReferenceProgress, RefPersonState } from "@/components/portal/requirement-action"
import type { ReqChecklistItem } from "@/components/portal/requirements-checklist"
import type { LibraryFile } from "@/components/portal/document-library"
import type { CurrentDoc } from "@/components/portal/document-uploader"
import type { FeeReceipts } from "@/components/portal/fee-panel"
import { computeFeeSummary, type FeeSummary } from "@/lib/fees"
import { deriveLadder } from "@/lib/requirements/ladder"
import { requiredReferences } from "@/lib/intake/schema"
import { cohabitantState } from "@/lib/cohabitants/process"
import { resolveFacts } from "@/lib/facts/resolve"

type DB = SupabaseClient<Database>

export interface RequirementView {
  items: ReqChecklistItem[]
  intakeDone: boolean
  prefills: Record<string, Record<string, unknown>>
  /** Latest GENERATED document per req_code (what the sign/regenerate UI acts on). */
  generated: Record<string, GeneratedDoc>
  /** Every file bound to a requirement, newest first. */
  filesByReq: Record<string, LibraryFile[]>
  /** The current UPLOAD per req_code — what the inline upload widget shows. */
  currentByReq: Record<string, CurrentDoc>
  /** Per-reference progress for the REF-01/REF-02 card, or null when no ref req. */
  referenceProgress: ReferenceProgress | null
  /**
   * Per-person progress for the COH-01 card — same shape and states as the
   * reference tracker so the two rosters read identically. Null when the case
   * has no cohabitant requirement or no cohabitants listed (lives alone).
   */
  cohabitantProgress: ReferenceProgress | null
  /** Files that belong to no requirement — request letters, worksheets. */
  looseFiles: LibraryFile[]
  signatureOnFile: string | null
  /** FEE-01's personalized breakdown — computed here so every surface agrees. */
  feeSummary: FeeSummary
  /** Whether they've filed each fee receipt (tracking only; never gates FEE-01). */
  feeReceipts: FeeReceipts
  /**
   * Identity fields the DMV-01 "email my request" draft interpolates — the same
   * data the questionnaire prefill uses, so nothing is retyped. NEVER includes
   * SSN (see the DMV fallback UI): name + DOB + address + DL/Client ID is the
   * whole verification set.
   */
  dmvApplicant: DmvApplicant
}

export interface DmvApplicant {
  fullName: string
  dob: string | null
  address: string
  email: string | null
  phone: string | null
}

export async function loadRequirementView(db: DB, myCase: MyCase): Promise<RequirementView> {
  const [
    reqRows,
    { data: intake },
    { data: savedAnswers },
    { data: docs },
    { data: sig },
    { data: kase },
    { data: reviews },
  ] = await Promise.all([
      getCaseRequirements(db, myCase.id),
      db.from("intake_sessions").select("completed_at, answers").eq("case_id", myCase.id).maybeSingle(),
      db.from("requirement_answers").select("req_code, answers, drafted_by").eq("case_id", myCase.id),
      db
        .from("documents")
        .select("id, req_code, type, file_name, file_path, created_at, status, generated, signed_at, review_notes, version")
        .eq("case_id", myCase.id)
        .order("created_at", { ascending: false }),
      db
        .from("signatures")
        .select("png_base64")
        .eq("case_id", myCase.id)
        .eq("signer_key", "applicant")
        .maybeSingle(),
      db.from("cases").select("is_renewal, license_track").eq("id", myCase.id).maybeSingle(),
      // The latest review per item — staff rows are filtered by RLS on the view.
      db
        .from("requirement_review_latest")
        .select("case_requirement_id, decision, note, reviewer_kind, created_at")
        .eq("case_id", myCase.id),
    ])

  // Questionnaire starting values: intake first, then anything already saved for
  // that requirement (so an edit round-trips instead of resetting).
  const intakeAnswers = (intake?.answers ?? {}) as unknown as WizardAnswers
  const prefillCtx: PrefillContext = {
    intake: intakeAnswers,
    clientName: myCase.client.full_name,
    borough: myCase.client.borough,
    zip: myCase.client.zip,
  }
  const savedByCode = new Map((savedAnswers ?? []).map((r) => [r.req_code, r.answers as Record<string, unknown>]))
  // Attribution: a draft whose drafted_by is NOT the applicant's own profile was
  // prepared by their full-scope sponsor. We surface "your sponsor prepared this —
  // review and sign" so nothing is done in the applicant's name silently. The
  // sponsor's NAME is intentionally not joined (profiles RLS hides it, and the
  // applicant already knows who their sponsor is).
  const { data: ownClient } = await db.from("clients").select("profile_id").eq("id", myCase.client_id).maybeSingle()
  const ownProfileId = ownClient?.profile_id ?? null
  const draftedBySponsor = new Map(
    (savedAnswers ?? []).map((r) => [r.req_code, !!r.drafted_by && r.drafted_by !== ownProfileId])
  )
  // The canonical fact layer: a fact-backed field prefills from case_facts (one
  // home, reused everywhere) rather than a per-questionnaire prefill function.
  const facts = await resolveFacts(db, myCase.id)
  const prefills: Record<string, Record<string, unknown>> = {}
  for (const row of reqRows) {
    const a = actionFor(row.req_code)
    // Both generated documents AND people-rosters (references, cohabitant
    // affidavits) prefill from the intake answers — the roster branch was being
    // skipped, which is why REF-01/REF-02/COH-01 came up blank in the checklist
    // even though the applicant already listed them during intake.
    if ((a?.mode !== "generate" && a?.mode !== "roster") || !a.questionnaireId) continue
    const q = questionnaireFor(a.questionnaireId)
    if (!q) continue
    // fact-backed fields (top-level + group fields), resolved from case_facts.
    const factPrefill: Record<string, unknown> = {}
    const collect = (fields: { name: string; fact?: string }[] | undefined) => {
      for (const f of fields ?? []) {
        // The SSN is never sent to the client — it's used server-side at fill time.
        if (f.fact && f.fact !== "applicant.ssn" && facts[f.fact]) factPrefill[f.name] = facts[f.fact]
      }
    }
    collect(q.fields)
    for (const g of q.groups ?? []) collect(g.fields)
    prefills[row.req_code] = { ...prefillFor(q, prefillCtx), ...factPrefill, ...(savedByCode.get(row.req_code) ?? {}) }
  }

  // Which requirement does an untagged upload belong to? Older uploads predate
  // req_code, so fall back to the document_type the action declares — the same
  // mapping the uploader used to write it.
  const byType = new Map<string, string>()
  for (const row of reqRows) {
    const t = actionFor(row.req_code)?.documentType
    if (t && !byType.has(t)) byType.set(t, row.req_code)
  }

  // FIREWALL (reverse direction): sponsor-owned rows (party='sponsor', the company
  // packet) are 'progress' to the applicant — row + status, NEVER the file. Their
  // documents are uploaded by the sponsor; the applicant's payload must carry NO
  // file_path, NO signed URL, NO filename for them. We skip signing and surfacing
  // those docs entirely below.
  const sponsorReqCodes = new Set(
    reqRows.filter((r) => r.requirement?.party === "sponsor").map((r) => r.req_code)
  )

  const generated: Record<string, GeneratedDoc> = {}
  const filesByReq: Record<string, LibraryFile[]> = {}
  // The latest UPLOADED (non-generated) doc per req_code — what the inline upload
  // widget shows as "current" so it can display status + View + Re-upload instead
  // of a perpetual "Not uploaded".
  const currentByReq: Record<string, CurrentDoc> = {}
  const looseFiles: LibraryFile[] = []
  // Signed URL per document id, so the smart-document shared-binding pass below
  // can reuse a link instead of signing the same file twice.
  const urlByDocId = new Map<string, string | null>()

  for (const d of docs ?? []) {
    // Sponsor packet documents never reach the applicant's payload — not even a
    // signed URL is minted for them.
    const dReqCode = d.req_code ?? byType.get(d.type) ?? null
    if (dReqCode && sponsorReqCodes.has(dReqCode)) continue

    let url: string | null = null
    if (d.file_path) {
      // 5 minutes, not an hour. A signed URL is a bearer token for a document
      // that may contain an arrest narrative — long TTLs survive in browser
      // history, shared links and proxy logs long after the session ends.
      const { data } = await db.storage.from("documents").createSignedUrl(d.file_path, 300)
      url = data?.signedUrl ?? null
    }
    urlByDocId.set(d.id, url)
    const file: LibraryFile = {
      id: d.id,
      name: d.file_name ?? d.type,
      url,
      createdAt: d.created_at,
      status: d.status,
      generated: d.generated,
      signedAt: d.signed_at,
    }

    const reqCode = d.req_code ?? byType.get(d.type) ?? null
    if (reqCode) {
      ;(filesByReq[reqCode] ??= []).push(file)
      // Keyed on req_code, NOT on "latest of this type": a generated addendum and
      // an uploaded ID can share neither slot nor fate.
      if (d.generated && !generated[reqCode]) {
        generated[reqCode] = { id: d.id, fileName: d.file_name, url, signedAt: d.signed_at }
      }
      // The newest UPLOAD is the widget's "current" (docs are newest-first).
      if (!d.generated && !currentByReq[reqCode]) {
        currentByReq[reqCode] = {
          status: d.status,
          review_notes: d.review_notes ?? null,
          version: d.version,
          signedUrl: url,
        }
      }
    } else {
      looseFiles.push(file)
    }
  }

  // Smart documents: a requirement can be answered by a file the applicant
  // uploaded for a DIFFERENT requirement (a passport uploaded for IDN-01 that
  // also covers IDN-02/IDN-03 via case_requirements.document_id). currentByReq is
  // keyed on the document's OWN req_code, so those siblings have no entry and
  // would otherwise show an empty uploader. Surface the shared file as their
  // "current" — named — so the card says "provided from …" instead of asking
  // again. Only for real (non-generated) uploads bound to another requirement.
  const docById = new Map((docs ?? []).map((d) => [d.id, d]))
  for (const row of reqRows) {
    if (sponsorReqCodes.has(row.req_code)) continue // firewall: never surface a sponsor file
    if (currentByReq[row.req_code]) continue
    if (!row.document_id) continue
    const d = docById.get(row.document_id)
    if (!d || d.generated || d.req_code === row.req_code) continue
    currentByReq[row.req_code] = {
      status: d.status,
      review_notes: d.review_notes ?? null,
      version: d.version,
      signedUrl: urlByDocId.get(d.id) ?? null,
      sharedFromName: d.file_name ?? "your uploaded document",
    }
  }

  const reviewByReq = new Map((reviews ?? []).map((r) => [r.case_requirement_id, r]))

  // Per-reference progress for the REF-01/REF-02 card: who's been invited, who
  // opened, who submitted (awaiting notary), who's fully notarized. Only queried
  // when a references requirement is actually on this case.
  const isRefRoster = (reqCode: string) => {
    const a = actionFor(reqCode)
    return a?.mode === "roster" && a.roster === "references"
  }
  let referenceProgress: ReferenceProgress | null = null
  if (reqRows.some((r) => isRefRoster(r.req_code))) {
    const [{ data: refs }, { data: refReqs }] = await Promise.all([
      db.from("character_references").select("id, name, received, notarized").eq("case_id", myCase.id).order("created_at"),
      db.from("reference_requests").select("reference_id, status, revoked_at").eq("case_id", myCase.id),
    ])
    const reqByRef = new Map((refReqs ?? []).map((r) => [r.reference_id, r]))
    const people = (refs ?? []).map((r) => {
      const rr = reqByRef.get(r.id)
      const active = rr && !rr.revoked_at
      let state: RefPersonState
      if (r.notarized) state = "notarized"
      else if (r.received) state = "submitted"
      else if (active && rr!.status === "opened") state = "opened"
      else if (active && rr!.status !== "pending") state = "invited"
      else state = "not_invited"
      return { name: r.name, state }
    })
    referenceProgress = {
      // Track-aware: carry_guard / special_carry_guard need TWO references, not four.
      required: requiredReferences(intakeAnswers, {
        isRenewal: kase?.is_renewal ?? false,
        licenseTrack: (kase?.license_track as "carry_guard" | "special_carry_guard" | undefined) ?? undefined,
      }),
      people,
      invitedCount: people.filter((p) => p.state !== "not_invited").length,
      notarizedCount: people.filter((p) => p.state === "notarized").length,
    }
  }
  const refInvited = (referenceProgress?.invitedCount ?? 0) > 0

  // Same journey tracking for household affidavits. States derive from the
  // timestamp trail (lib/cohabitants/process.cohabitantState); "required" is
  // every adult listed — there's no track-dependent count like references.
  const isCohabRoster = (reqCode: string) => {
    const a = actionFor(reqCode)
    return a?.mode === "roster" && a.roster === "cohabitants"
  }
  let cohabitantProgress: ReferenceProgress | null = null
  if (reqRows.some((r) => isCohabRoster(r.req_code))) {
    const { data: cohabs } = await db
      .from("cohabitants")
      .select("name, affidavit_status, token, token_revoked_at, opened_at")
      .eq("case_id", myCase.id)
      .order("created_at")
    if (cohabs && cohabs.length > 0) {
      const people = cohabs.map((c) => ({ name: c.name, state: cohabitantState(c) as RefPersonState }))
      cohabitantProgress = {
        required: people.length,
        people,
        invitedCount: people.filter((p) => p.state !== "not_invited").length,
        notarizedCount: people.filter((p) => p.state === "notarized").length,
      }
    }
  }

  const items: ReqChecklistItem[] = reqRows.map((row) => {
    const review = reviewByReq.get(row.id)
    // The current uploaded doc for this req (associated by req_code, with the
    // same type-fallback the widget uses). Its status is what the upload widget
    // shows, so the ladder derives from it too — the card and the widget agree.
    const currentDoc = currentByReq[row.req_code]
    // Multi-part uploads (e.g. the guard card front + back): count the uploaded
    // (non-generated) files bound to this req against the fixed part count so the
    // card can say "1 of 2 uploaded" and never read as fully in until both parts
    // are present.
    const act = actionFor(row.req_code)
    const needFiles = act && act.mode === "obtain" ? act.minFiles : undefined
    const haveFiles = (filesByReq[row.req_code] ?? []).filter((f) => !f.generated).length
    return {
    id: row.id,
    reqCode: row.req_code,
    status: row.status,
    // Where this item actually stands, in the applicant's terms. Derived from
    // status + evidence + the latest review, never stored (lib/requirements/ladder).
    ladder: deriveLadder({
      status: row.status,
      // A current uploaded doc counts as evidence even if case_requirements
      // .document_id was never bound (the desync that showed IDN-03 as both
      // "Approved" in the widget and "Not started" on the card).
      hasEvidence: !!(row.document_id || row.reference_id || row.cohabitant_id) || !!currentDoc,
      docStatus: currentDoc?.status ?? null,
      latestReview: review?.decision ? { decision: review.decision } : null,
      rosterInvited:
        (isRefRoster(row.req_code) && refInvited) ||
        (isCohabRoster(row.req_code) && (cohabitantProgress?.invitedCount ?? 0) > 0),
    }),
    reviewNote: review?.decision === "changes_requested" ? (review.note ?? null) : null,
    reviewerKind: review?.reviewer_kind ?? null,
    title: row.requirement?.title ?? row.req_code,
    description: row.requirement?.description ?? null,
    authority: row.requirement?.authority ?? null,
    severity: row.requirement?.severity ?? "high",
    documentType: row.requirement?.document_type ?? null,
    // A rule a court has stopped is shown as not-currently-required rather than
    // hidden — an applicant who reads NYPD's (stale) checklist should find out
    // here why we aren't asking for it.
    legalStatus: row.requirement?.legal_status ?? "enforced",
    legalCitation: row.requirement?.legal_citation ?? null,
    parts: needFiles ? { have: haveFiles, need: needFiles } : undefined,
    sponsorManaged: row.requirement?.party === "sponsor",
    preparedBySponsor: draftedBySponsor.get(row.req_code) ?? false,
    destination: (row.requirement?.destination ?? "internal") as "portal_upload" | "interview" | "internal",
    }
  })

  // Fees are personalized (retired-LEO waiver, renewal wording) and every amount
  // comes from the fee schedule, so an admin edit moves all of this at once.
  const feeSummary = await computeFeeSummary(db, {
    isRetiredLeo: intakeAnswers.isRetiredLeo,
    isRenewal: kase?.is_renewal,
  })
  const feeReceipts: FeeReceipts = {
    nypd: (docs ?? []).some((d) => d.type === "nypd_fee_receipt"),
    fingerprint: (docs ?? []).some((d) => d.type === "fingerprint_fee_receipt"),
  }

  // Same identity set the questionnaire prefill uses — reused so the DMV draft
  // never asks the applicant to retype what intake already knows. No SSN.
  const dmvApplicant: DmvApplicant = {
    fullName: myCase.client.full_name,
    dob: intakeAnswers.dob ?? null,
    address: formatLegalAddress(intakeAnswers),
    email: myCase.client.email,
    phone: myCase.client.phone,
  }

  return {
    items,
    intakeDone: !!intake?.completed_at,
    feeSummary,
    feeReceipts,
    prefills,
    generated,
    filesByReq,
    currentByReq,
    referenceProgress,
    cohabitantProgress,
    looseFiles,
    signatureOnFile: sig?.png_base64 ?? null,
    dmvApplicant,
  }
}
