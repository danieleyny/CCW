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
import type { ApplicationValues } from "@/lib/forms/application"
import { renderSignedApplicationRecord } from "@/lib/disclosures/signed-record"

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
  /** DSC-01 only: the assembled application values (facts + intake + disclosures +
   *  letter of necessity) for the signed answers + authorization record. */
  record?: ApplicationValues
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

/** The confidentiality election (Public Records Exemption) — our record of the
 *  grounds and election the applicant chose, which staff enter inline on the portal. */
async function confidentialityRecord(name: string, a: Record<string, unknown>, sign: SignOpts) {
  const requesting = a.requesting === "yes" || a.requesting === true
  const grounds: [string, string][] = [
    ["g1a", "Active/retired police, peace, probation, parole, or corrections officer"],
    ["g1b", "Protected person under a currently valid order of protection"],
    ["g1c", "Witness in a criminal proceeding"],
    ["g1d", "Juror or grand juror in a criminal proceeding"],
    ["g2", "Safety may be endangered for another reason (see below)"],
    ["g3", "Spouse/domestic partner/household member of a person described above"],
    ["g4", "May be subject to unwarranted harassment on disclosure"],
  ]
  return buildPdf((c) => {
    c.heading("Confidentiality Request — Public Records Exemption", "Our record of your election; not an NYPD form")
    c.rule()
    c.para(`Requesting confidentiality: ${requesting ? "Yes" : "No"}`)
    if (requesting) {
      c.spacer()
      c.para("Grounds selected:", { size: 10, color: "muted" })
      for (const [k, label] of grounds) if (a[k] === true || a[k] === "true") c.para(`  • ${label}`)
      if (str(a.item5)) {
        c.spacer()
        c.para("Additional supportive information:", { size: 10, color: "muted" })
        c.para(str(a.item5))
      }
      c.spacer()
      c.para(`Scope: ${a.election === "withdraw" ? "Not submitting a request / withdrawing any previous request" : "Apply to all my NYC handgun licence applications and licences"}`)
    }
  }, sign)
}

/** Penal Law 35/265/400 — a plain-language EXPLANATION of what the articles cover
 *  (never advice about the applicant's own facts), which the applicant reads and
 *  signs. Not notarised; held internally. */
async function penalLawAffirmation(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  return buildPdf((c) => {
    c.heading("New York Penal Law — Articles 35, 265 & 400", "A plain-language summary. Not legal advice.")
    c.rule()
    c.para(
      "Your application asks you to affirm that you have read and are familiar with New York Penal Law Articles 35, 265 and 400. This document summarizes what each covers so you can make that affirmation informed. It describes the law in general terms; it does not tell you how the law applies to your own situation — for that, speak with a New York attorney.",
      { size: 10, color: "muted" }
    )
    c.spacer()
    c.h2("Article 35 — Justification")
    c.para(
      "Sets out when the use of physical force, including deadly physical force, is legally justified — self-defense and the defense of others, the defense of premises and property, and the limits and duties (such as when retreat is required) that apply. Justification is a defense to what would otherwise be an offense."
    )
    c.spacer()
    c.h2("Article 265 — Firearms and Other Dangerous Weapons")
    c.para(
      "Defines the criminal possession and use of firearms and other weapons — including unlawful possession, possession in sensitive locations, and the aggravating circumstances that raise the degree of the offense. It also defines a “serious offense,” which matters to licence eligibility."
    )
    c.spacer()
    c.h2("Article 400 — Licensing of Firearms")
    c.para(
      "Governs the licensing of handguns — eligibility, the application and investigation process, the types of licences, the duties and responsibilities of a licensee (including safe storage and reporting obligations), and the grounds and process for suspension or revocation."
    )
    c.spacer()
    c.para("Statutes: NY Penal Law Article 35, Article 265, and Article 400 (available at nysenate.gov/legislation/laws/PEN).", { size: 9, color: "muted" })
    c.rule()
    c.para("I affirm that I have read and am familiar with the summaries of Penal Law Articles 35, 265 and 400 set out above.", { size: 10 })
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
  const sections = buildWorksheet(a as unknown as ApplicationValues, {
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
  "AFF-02": "Penal Law 35/265/400 Affirmation",
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
    case "AFF-02":
      return { bytes: await penalLawAffirmation(n, a, sig, sign), fileName: "penal-law-affirmation.pdf", documentType: "affirmation_penal_law", label: "Penal Law 35/265/400 affirmation" }
    case "CON-01":
      return { bytes: await confidentialityRecord(n, a, sign), fileName: "confidentiality-request.pdf", documentType: "public_records_exemption", label: "Confidentiality request" }
    case "SAF-01":
      return { bytes: await safeStorageStatement(n, a, sig, sign), fileName: "safe-storage-statement.pdf", documentType: "safeguard_ack", label: "Safe storage statement" }
    case "SOC-01":
      return { bytes: await socialMediaDisclosure(n, str(a.handles), dated, sig, sign), fileName: "social-media-list.pdf", documentType: "social_media_list", label: "Social media list (optional)" }
    case "DSC-01":
      // THE signed answers + authorization record (Part 5) — every portal disclosure
      // question with the applicant's answer, the application details, and their
      // authorization for us to enter them into the portal. Replaces the old summary.
      return { bytes: await renderSignedApplicationRecord(n, a, input.record ?? ({} as ApplicationValues), { signaturePng: sig, signedAt }), fileName: "application-answers.pdf", documentType: "disclosure_summary", label: "Application answers & authorization" }
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
