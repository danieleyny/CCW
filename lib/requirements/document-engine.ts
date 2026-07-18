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
import { brand } from "@/config/brand"
import { SIGNING_CONSENT } from "@/lib/requirements/consent"

type DB = SupabaseClient<Database>
type DocumentType = Database["public"]["Enums"]["document_type"]

const PREPARED_BY = `Prepared by ${brand.name}. This is not an official NYPD form — it is a prepared document you review, sign, and submit with your own application.`

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

/** Q10–28 addendum — one written explanation per "yes". */
async function disclosureAddendum(name: string, a: Record<string, unknown>, sig: Uint8Array | undefined, sign: SignOpts) {
  const items: { q: string; explain: string }[] = []
  const push = (flag: unknown, q: string, key: string) => {
    if (isYes(flag)) items.push({ q, explain: str(a[key]) })
  }
  push(a.everArrested, "Have you ever been arrested, indicted, or summonsed?", "arrestExplanation")
  push(a.orderOfProtection, "Has an order of protection ever been issued against you or on your behalf?", "oopExplanation")
  push(a.domesticIncident, "Has a domestic incident report ever been filed involving you?", "dirExplanation")
  push(a.mentalHealth, "Have you ever been involuntarily committed or adjudicated as lacking mental capacity?", "mhExplanation")
  push(a.licenseDenied, "Has a firearms license ever been denied, suspended, or revoked?", "denialExplanation")

  return buildPdf((c) => {
    c.heading("Handgun License Application — Addendum", "Written explanations (PD 643-041A style)")
    c.rule()
    if (items.length === 0) {
      c.para("The applicant answered “no” to each disclosure question; no written explanation is required.")
    } else {
      c.para(
        "The following explanations are provided in the applicant's own words. Sealed, dismissed, and nullified matters are disclosed here notwithstanding CPL Article 160.",
        { color: "muted", size: 10 }
      )
      c.spacer()
      for (const [i, it] of items.entries()) {
        c.h2(`${i + 1}. ${it.q}`)
        c.para(it.explain || "(no explanation provided)")
        c.spacer()
      }
    }
    c.rule()
    c.para("I affirm the statements above are true and complete to the best of my knowledge.", { size: 10 })
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
    c.para(`Method: ${kind}${str(a.safeguardName) ? ` (${str(a.safeguardName)})` : ""}`)
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

/** Copy-into-the-portal worksheet. We prepare; the applicant files. */
async function applicationWorksheet(name: string, a: Record<string, unknown>, sign: SignOpts) {
  return buildPdf((c) => {
    c.heading("Application Worksheet", "Copy these answers into the NYPD online application")
    c.para(PREPARED_BY, { size: 9, color: "muted" })
    c.rule()
    c.para(
      "You file your own application at licensing.nypdonline.org. This sheet puts your answers in one place so you can enter them without hunting. We do not submit anything on your behalf.",
      { size: 10 }
    )
    c.spacer()
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === "string" && v.trim()) c.para(`${k}: ${v}`)
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
  "DSC-01": "Handgun License Application — Addendum",
  "QUE-01": "Handgun License Application — Addendum",
  "ARR-01": "Arrest Statements",
  "OOP-01": "Order of Protection Statement",
  "DIR-01": "Domestic Incident Statement",
  WORKSHEET: "Application Worksheet",
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
    case "QUE-01":
      return { bytes: await disclosureAddendum(n, a, sig, sign), fileName: "disclosure-addendum.pdf", documentType: "disclosure_addendum", label: "Disclosure addendum" }
    case "ARR-01":
      return { bytes: await arrestNarratives(n, toArrests(a.arrests), dated, sig, sign), fileName: "arrest-statements.pdf", documentType: "arrest_statement", label: "Arrest statements" }
    case "OOP-01":
      return { bytes: await protectionOrderStatement(n, a, sig, sign), fileName: "order-of-protection-statement.pdf", documentType: "order_of_protection_statement", label: "Order of protection statement" }
    case "DIR-01":
      return { bytes: await domesticIncidentStatement(n, a, sig, sign), fileName: "domestic-incident-statement.pdf", documentType: "domestic_incident_statement", label: "Domestic incident statement" }
    case "WORKSHEET":
      return { bytes: await applicationWorksheet(n, a, sign), fileName: "application-worksheet.pdf", documentType: "application_worksheet", label: "Application worksheet" }
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
  args: { caseId: string; clientId: string; reqCode: string; doc: RenderedDocument; signedAt?: Date }
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
