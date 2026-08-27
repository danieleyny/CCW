/**
 * The generate-and-store half of the document engine.
 *
 * renderRequirementDocument() turns a requirement's questionnaire answers into a
 * finished PDF; generateAndStore() persists it into the SAME documents bucket +
 * table as an upload, tagged with req_code + generated=true, so it appears
 * wherever documents already render (portal, admin) and inherits the same RLS —
 * which means instructors still can't see it.
 *
 * LABELLING: nothing we produce claims to be an official NYPD form. Each
 * document carries a "Prepared by Gun License NYC" line. If a real fillable
 * government template is ever added, lib/pdf/acroform.ts fills it instead.
 *
 * WE DON'T FILE: the application worksheet is a copy-into-the-portal sheet. The
 * applicant submits their own application at licensing.nypdonline.org.
 */
import { createHash } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { buildPdf, longDate } from "@/lib/pdf/builder"
import { SECTION_B_QUESTIONS } from "@/lib/requirements/questionnaires"
import {
  affirmationOfUnderstanding,
  socialMediaDisclosure,
  arrestNarratives,
  certOfDispositionRequests,
  type ArrestEntry,
  type SignOpts,
} from "@/lib/forms/documents"
import { generateCohabitantAffidavitPdf } from "@/lib/cohabitants/document"
import { SIGNING_CONSENT } from "@/lib/requirements/consent"
import { buildWorksheet, type WorksheetContext } from "@/lib/requirements/worksheet"
import type { WizardAnswers } from "@/lib/intake/answers"

type DB = SupabaseClient<Database>
type DocumentType = Database["public"]["Enums"]["document_type"]

const PREPARED_BY = `This is not an official NYPD form — it is a prepared worksheet. Review it, then enter your answers into your own application.`

export interface RenderInput {
  reqCode: string
  applicantName: string
  answers: Record<string, unknown>
  signaturePng?: Uint8Array
  /**
   * When the applicant signed. Present ⇒ signed rendering (signature stamped,
   * this date printed). Absent ⇒ DRAFT: banner on every page, blank signature
   * and date line. The date on a document is a SIGNING date, never a render
   * date — that was the Phase 3 bug.
   */
  signedAt?: Date
  /** Short case reference for the letterhead. */
  caseRef?: string
  /** Applicant contact/zip for the worksheet's copy-paste fields, when known. */
  worksheetContext?: WorksheetContext
}

export interface RenderedDocument {
  bytes: Uint8Array
  fileName: string
  /** REQUIRED. Every generated document files under its own type — there is no
   *  fallback. A missing type must fail loudly, never land in the ID slot. */
  documentType: DocumentType
  label: string
}

const str = (v: unknown): string => (typeof v === "string" ? v : "")
const rows = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
const isYes = (v: unknown): boolean => v === true || v === "yes"

/**
 * PD 643-041A — the OFFICIAL addendum. A two-column record (Question Number ·
 * Detailed Explanation) that lists ONLY the "yes" answers, keyed by the form's own
 * question number. When there are no "yes" answers this document is NOT produced at
 * all (QUE-01 fires only `if_any_q_yes`); listing twenty "no" rows on PD 643-041A
 * is a misuse of the form.
 */
async function disclosureAddendum(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  const items = SECTION_B_QUESTIONS.filter((q) => isYes(a[`q${q.no}`])).map((q) => ({
    no: q.no,
    q: q.text,
    explain: str(a[`q${q.no}_explain`]),
  }))

  return buildPdf((c) => {
    c.heading("Handgun License Application — Addendum", "PD 643-041A · written explanations for “yes” answers to questions 10–28")
    c.rule()
    c.para(
      "Each explanation below corresponds, by question number, to a “yes” answer on the application. Sealed, dismissed, and nullified matters are disclosed here notwithstanding CPL Article 160.",
      { color: "muted", size: 10 }
    )
    c.spacer()
    for (const it of items) {
      c.h2(`Question ${it.no}`)
      c.para(it.q, { color: "muted", size: 9 })
      c.para(it.explain || "(no explanation provided)")
      c.spacer()
    }
    c.rule()
    c.para("I affirm the statements above are true and complete to the best of my knowledge.", { size: 10 })
    c.signatureImage("Applicant signature")
  }, { signaturePng: sig, ...sign })
}

/**
 * OUR internal disclosure summary — NOT an NYPD form. Lists EVERY question 10–28
 * with the applicant's Yes/No answer (and the explanation on a "yes"), so he and the
 * case team can see the complete record and transcribe it into the NYPD portal
 * accurately. Clearly labelled as ours. Signed so DSC-01 (completeness attestation)
 * is satisfied the same way it always was.
 */
async function disclosureSummary(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  return buildPdf((c) => {
    c.heading(
      "Disclosure Summary — internal worksheet",
      "NOT an NYPD form. Your complete answers to application questions 10–28, kept so you and your case team can transcribe them into the NYPD portal accurately."
    )
    c.rule()
    for (const q of SECTION_B_QUESTIONS) {
      const yes = isYes(a[`q${q.no}`])
      c.h2(`${q.no}. ${yes ? "Yes" : "No"}`)
      c.para(q.text, { color: "muted", size: 9 })
      if (yes) c.para(str(a[`q${q.no}_explain`]) || "(no explanation provided)")
      c.spacer()
    }
    c.rule()
    c.para(
      "This is our internal summary to help you complete the NYPD application accurately. It is not an NYPD form and is not filed with the NYPD.",
      { color: "muted", size: 9 }
    )
    c.para("I affirm the answers above are true and complete to the best of my knowledge.", { size: 10 })
    c.signatureImage("Applicant signature")
  }, { signaturePng: sig, ...sign })
}

async function protectionOrderStatement(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  return buildPdf((c) => {
    c.heading("Order of Protection — Written Statement")
    c.rule()
    c.para(`Date issued: ${str(a.issuedOn) || "—"}`)
    c.para(`Issuing court: ${str(a.court) || "—"}`)
    c.para(`Current status: ${str(a.status) || "—"}`)
    c.spacer()
    c.h2("Circumstances")
    c.para(str(a.explanation) || "(no explanation provided)")
    c.spacer()
    c.para("A copy of the order is submitted with this statement.", { size: 10, color: "muted" })
    c.signatureImage("Applicant signature")
  }, { signaturePng: sig, ...sign })
}

async function domesticIncidentStatement(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  return buildPdf((c) => {
    c.heading("Domestic Incident Report — Written Disclosure")
    c.rule()
    c.para(`Date: ${str(a.occurredOn) || "—"}`)
    c.para(`Agency: ${str(a.agency) || "—"}`)
    c.para(`Outcome: ${str(a.outcome) || "—"}`)
    c.spacer()
    c.h2("Circumstances")
    c.para(str(a.explanation) || "(no explanation provided)")
    c.signatureImage("Applicant signature")
  }, { signaturePng: sig, ...sign })
}

async function safeStorageStatement(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  const kind =
    str(a.storageType) === "lockbox" ? "a locked box or cabinet"
    : str(a.storageType) === "trigger_lock" ? "a trigger or cable lock inside a locked container"
    : "a locked gun safe"
  return buildPdf((c) => {
    c.heading("Safe Storage Statement")
    c.rule()
    c.para(`Storage address: ${str(a.address) || "—"}`)
    c.para(`Method: ${kind}${str(a.safeStorageMakeModel) ? ` (${str(a.safeStorageMakeModel)})` : ""}`)
    c.spacer()
    c.para(
      "I will store any handgun secured as described above when it is not in my immediate possession and control, consistent with P.L. §265.45 and NYC Administrative Code §10-312.",
    )
    if (isYes(a.othersInHome)) {
      c.spacer()
      c.para("Other adults reside at this address; a cohabitant affidavit is provided for each.", { size: 10, color: "muted" })
    }
    c.signatureImage("Applicant signature")
  }, { signaturePng: sig, ...sign })
}

/**
 * Copy-into-the-portal worksheet. We prepare; the applicant files.
 *
 * Renders FROM the coverage map (config/application-coverage.ts) in the
 * application's own field order — so it can never drift from the live field
 * list, and it never dumps a raw jsonb key the way the old version did.
 */
async function applicationWorksheet(
  name: string,
  a: Record<string, unknown>,
  sign: SignOpts,
  ctx?: WorksheetContext
) {
  const sections = buildWorksheet(a as WizardAnswers, {
    applicantName: name,
    phone: ctx?.phone ?? null,
    email: ctx?.email ?? null,
    zip: ctx?.zip ?? null,
  })
  return buildPdf((c) => {
    c.heading("Application Worksheet", "Copy these answers into the NYPD online application")
    c.para(PREPARED_BY, { size: 9, color: "muted" })
    c.rule()
    c.para(
      "You file your own application at licensing.nypdonline.org. This sheet puts your answers in the form's own order so you can enter them without hunting. We prepare and organize — we never submit it for you. Lines marked “enter at filing” are ones we deliberately don't store — like your Social Security number.",
      { size: 10 }
    )
    for (const section of sections) {
      c.spacer()
      c.h2(section.label)
      for (const row of section.rows) {
        const label = row.questionNo ? `Q${row.questionNo}. ${row.label}` : row.label
        c.para(label, { size: 9, color: "muted" })
        // Multi-line values (the histories) render one line each.
        for (const line of row.value.split("\n")) c.para(line, { size: 11 })
      }
    }
  }, sign)
}

const toArrests = (v: unknown): ArrestEntry[] =>
  rows(v).map((r) => ({
    occurredOn: str(r.occurredOn),
    jurisdiction: str(r.jurisdiction),
    disposition: str(r.disposition),
    narrative: str(r.narrative),
  }))

/** Letterhead / PDF-metadata title per requirement. */
const TITLES: Record<string, string> = {
  "AFF-01": "Affirmation of Understanding",
  "SAF-01": "Safe Storage Statement",
  "SOC-01": "Social Media List",
  "DSC-01": "Disclosure Summary (internal worksheet)",
  "QUE-01": "Handgun License Application — Addendum",
  "ARR-01": "Arrest Statements",
  "OOP-01": "Order of Protection Statement",
  "DIR-01": "Domestic Incident Statement",
  WORKSHEET: "Application Worksheet",
  "COH-01": "Statement of Sole Occupancy",
}

/** Route a requirement to its generator. */
export async function renderRequirementDocument(input: RenderInput): Promise<RenderedDocument> {
  const { reqCode, applicantName: n, answers: a, signedAt } = input
  // A signature only counts when we know WHEN it was applied — an image with no
  // signing act behind it renders as a draft, not as a signed document.
  const sig = signedAt ? input.signaturePng : undefined
  const sign: SignOpts = {
    signedAt,
    draft: !sig,
    applicantName: n,
    caseRef: input.caseRef,
    docTitle: TITLES[reqCode] ?? "Prepared document",
  }
  const dated = signedAt ? longDate(signedAt) : "Draft — unsigned"

  switch (reqCode) {
    case "AFF-01":
      return { bytes: await affirmationOfUnderstanding(n, dated, sig, sign), fileName: "affirmation-of-understanding.pdf", documentType: "affirmation_understanding", label: "Affirmation of understanding" }
    case "SAF-01":
      return { bytes: await safeStorageStatement(n, a, sig, sign), fileName: "safe-storage-statement.pdf", documentType: "safeguard_ack", label: "Safe storage statement" }
    case "SOC-01":
      return { bytes: await socialMediaDisclosure(n, str(a.handles), dated, sig, sign), fileName: "social-media-list.pdf", documentType: "social_media_list", label: "Social media list (optional)" }
    case "DSC-01":
      // OUR internal worksheet — every question 10–28 with its answer.
      return { bytes: await disclosureSummary(n, a, sig, sign), fileName: "disclosure-summary.pdf", documentType: "disclosure_summary", label: "Disclosure summary (internal)" }
    case "QUE-01":
      // The OFFICIAL PD 643-041A addendum — "yes" answers only, keyed by question number.
      return { bytes: await disclosureAddendum(n, a, sig, sign), fileName: "disclosure-addendum.pdf", documentType: "disclosure_addendum", label: "Disclosure addendum" }
    case "ARR-01":
      return { bytes: await arrestNarratives(n, toArrests(a.arrests), dated, sig, sign), fileName: "arrest-statements.pdf", documentType: "arrest_statement", label: "Arrest statements" }
    case "OOP-01":
      return { bytes: await protectionOrderStatement(n, a, sig, sign), fileName: "order-of-protection-statement.pdf", documentType: "order_of_protection_statement", label: "Order of protection statement" }
    case "DIR-01":
      return { bytes: await domesticIncidentStatement(n, a, sig, sign), fileName: "domestic-incident-statement.pdf", documentType: "domestic_incident_statement", label: "Domestic incident statement" }
    case "COH-01": {
      // Only the sole-occupancy case belongs here: it's the applicant's own
      // statement. With household members there is no single document for them
      // to sign — each adult signs their own through the token flow, which is
      // what the roster mode handles.
      if (!isYes(a.livesAlone)) {
        throw new Error(
          "Household affidavits are completed by each adult through their own private link, not generated here."
        )
      }
      return {
        bytes: await generateCohabitantAffidavitPdf({
          applicantName: n,
          cohabitantName: n,
          liveAlone: true,
          dateStr: dated,
          caseRef: input.caseRef,
          signaturePng: sig,
          ...sign,
        }),
        fileName: "sole-occupancy-statement.pdf",
        documentType: "cohabitant_affidavit",
        label: "Sole-occupancy statement",
      }
    }
    case "WORKSHEET":
      return { bytes: await applicationWorksheet(n, a, sign, input.worksheetContext), fileName: "application-worksheet.pdf", documentType: "application_worksheet", label: "Application worksheet" }
    default:
      throw new Error(`No generator for ${reqCode}`)
  }
}

/** The companion request letter for ARR-01 (helps OBTAIN the court certificate). */
export async function renderCompanionDocument(input: RenderInput): Promise<RenderedDocument> {
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" })
  if (input.reqCode === "ARR-01") {
    return {
      bytes: await certOfDispositionRequests(
        input.applicantName,
        toArrests(input.answers.arrests),
        today,
        undefined,
        {
          applicantName: input.applicantName,
          caseRef: input.caseRef,
          docTitle: "Certificate of Disposition Requests",
        }
      ),
      fileName: "certificate-of-disposition-requests.pdf",
      documentType: "court_request_letter",
      label: "Court request letters",
    }
  }
  throw new Error(`No companion document for ${input.reqCode}`)
}

/**
 * Persist a generated document: storage object + documents row tagged
 * generated=true with its req_code. Service-role because the row records
 * server-derived values (path, provenance) on a table the client may not
 * arbitrarily write — the caller has already proven case ownership.
 */
export async function storeGeneratedDocument(
  admin: DB,
  args: {
    caseId: string
    clientId: string
    reqCode: string
    doc: RenderedDocument
    signedAt?: Date
    /** Traceability: which official template + hash produced this document. */
    templateKey?: string
    templateSha256?: string
  }
): Promise<string> {
  const { caseId, clientId, reqCode, doc, signedAt } = args

  const { data: row, error: insErr } = await admin
    .from("documents")
    .insert({
      case_id: caseId,
      client_id: clientId,
      type: doc.documentType, // real type per document — never a fallback
      file_name: doc.fileName,
      status: "pending",
      req_code: reqCode,
      generated: true,
      signed_at: signedAt?.toISOString() ?? null,
      template_key: args.templateKey ?? null,
      template_sha256: args.templateSha256 ?? null,
    })
    .select("id")
    .single()
  if (insErr || !row) throw new Error(insErr?.message ?? "Could not record the document")

  const path = `clients/${clientId}/${row.id}/${doc.fileName}`
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, Buffer.from(doc.bytes), { contentType: "application/pdf", upsert: true })
  if (upErr) {
    await admin.from("documents").delete().eq("id", row.id)
    throw new Error(upErr.message)
  }

  await admin.from("documents").update({ file_path: path }).eq("id", row.id)
  return row.id
}

/**
 * Replace a generated document's bytes in place and mark it signed.
 *
 * Signing re-renders the SAME content with the signature and signing date
 * stamped in, then overwrites the draft at its existing storage path. One row
 * per generation — the draft doesn't linger as a second, near-identical
 * document the applicant could file by mistake.
 */
export async function markGeneratedDocumentSigned(
  admin: DB,
  args: { documentId: string; filePath: string; bytes: Uint8Array; signedAt: Date }
): Promise<void> {
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(args.filePath, Buffer.from(args.bytes), { contentType: "application/pdf", upsert: true })
  if (upErr) throw new Error(upErr.message)

  const { error } = await admin
    .from("documents")
    .update({ signed_at: args.signedAt.toISOString() })
    .eq("id", args.documentId)
  if (error) throw new Error(error.message)
}

export { SIGNING_CONSENT }

/**
 * Record a signing act. The PNG in `signatures` is a reusable image, not a
 * record — this binds a specific signer to the EXACT bytes they signed
 * (SHA-256), with when, from where, and what they consented to. Append-only.
 */
export async function recordSignatureEvent(
  admin: DB,
  args: {
    caseId: string
    signerKey: string
    documentId: string
    reqCode: string
    bytes: Uint8Array
    ip?: string | null
    userAgent?: string | null
    consentText?: string
  }
): Promise<void> {
  const sha256 = createHash("sha256").update(Buffer.from(args.bytes)).digest("hex")
  await admin.from("signature_events").insert({
    case_id: args.caseId,
    signer_key: args.signerKey,
    document_id: args.documentId,
    req_code: args.reqCode,
    document_sha256: sha256,
    consent_text: args.consentText ?? SIGNING_CONSENT,
    ip: args.ip ?? null,
    user_agent: args.userAgent ?? null,
  })
}
