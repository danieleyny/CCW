/**
 * Smart documents — one uploaded document, every requirement it legitimately
 * covers. A single U.S. passport proves photo ID (IDN-01), date of birth
 * (IDN-02), AND citizenship (IDN-03); today the applicant uploads it three
 * times. This is the auditable map of "what the applicant uploaded" → the set of
 * requirement codes it satisfies, plus the DocumentType it's stored as.
 *
 * RULES (why the map looks under-claimed on purpose):
 *  - Only include a (kind → reqCode) edge that is TRUE for that document. A
 *    driver's license is not proof of citizenship; a birth certificate is not a
 *    photo ID. When unsure, DON'T map it — under-claiming is safe; over-claiming
 *    attaches the wrong evidence to a requirement.
 *  - Meanings are anchored to the registry (lib/requirements/actions.ts):
 *      IDN-01 = government photo ID · IDN-02 = proof of date of birth ·
 *      IDN-03 = proof of citizenship / lawful status · RES-01 = proof of residence.
 *  - The resolver only ever returns codes that (a) exist on THIS case and (b) are
 *    still outstanding — it never widens beyond the map or re-touches a satisfied
 *    requirement.
 */
import type { DocumentType } from "@/lib/doc-types"

export type DocumentKind =
  | "us_passport"
  | "drivers_license_or_state_id"
  | "us_birth_certificate"
  | "naturalization_certificate"
  | "permanent_resident_card"
  | "proof_of_residence"
  | "residence_tax_bill"
  | "residence_coop_condo"
  | "residence_lease"
  | "residence_maintenance_bill"

export interface SmartDocument {
  kind: DocumentKind
  /** Human label shown in the "What is this document?" picker. */
  label: string
  /** Short reassurance of what else it completes. */
  covers: string
  /** How the uploaded file is stored (mirrors requirements.document_type). */
  documentType: DocumentType
  /** Requirement codes this document legitimately satisfies. Curated, not guessed. */
  reqCodes: string[]
}

export const SMART_DOCUMENTS: SmartDocument[] = [
  {
    kind: "us_passport",
    label: "U.S. passport",
    covers: "photo ID, date of birth, and citizenship",
    documentType: "id",
    reqCodes: ["IDN-01", "IDN-02", "IDN-03"],
  },
  {
    kind: "permanent_resident_card",
    label: "Permanent Resident Card (green card)",
    covers: "photo ID, date of birth, and lawful status",
    documentType: "id",
    reqCodes: ["IDN-01", "IDN-02", "IDN-03"],
  },
  {
    kind: "drivers_license_or_state_id",
    label: "Driver's license / State ID",
    covers: "photo ID and date of birth",
    documentType: "id",
    // A license is NOT proof of citizenship — deliberately no IDN-03.
    reqCodes: ["IDN-01", "IDN-02"],
  },
  {
    kind: "us_birth_certificate",
    label: "U.S. birth certificate",
    covers: "date of birth and citizenship",
    documentType: "id",
    // A birth certificate is NOT a photo ID — deliberately no IDN-01.
    reqCodes: ["IDN-02", "IDN-03"],
  },
  {
    kind: "naturalization_certificate",
    label: "Naturalization certificate",
    covers: "citizenship and date of birth",
    documentType: "id",
    // Proves citizenship + states DOB, but the registry's photo-ID list is
    // license/state-ID/passport — so no IDN-01.
    reqCodes: ["IDN-03", "IDN-02"],
  },
  // Proof of residence — the NYPD online portal's OWN accepted list, each its own
  // selectable kind. A bank statement is NOT on it and a cell-phone bill is excluded.
  {
    kind: "proof_of_residence",
    label: "Utility bill",
    covers: "proof of residence",
    documentType: "proof_residence",
    reqCodes: ["RES-01"],
  },
  {
    kind: "residence_tax_bill",
    label: "Real estate tax bill",
    covers: "proof of residence",
    documentType: "proof_residence",
    reqCodes: ["RES-01"],
  },
  {
    kind: "residence_coop_condo",
    label: "Proof of ownership in a co-op or condo",
    covers: "proof of residence",
    documentType: "proof_residence",
    reqCodes: ["RES-01"],
  },
  {
    kind: "residence_lease",
    label: "Lease",
    covers: "proof of residence",
    documentType: "proof_residence",
    reqCodes: ["RES-01"],
  },
  {
    kind: "residence_maintenance_bill",
    label: "Maintenance bill",
    covers: "proof of residence",
    documentType: "proof_residence",
    reqCodes: ["RES-01"],
  },
]

const BY_KIND = new Map(SMART_DOCUMENTS.map((d) => [d.kind, d]))

export function smartDocument(kind: string): SmartDocument | undefined {
  return BY_KIND.get(kind as DocumentKind)
}

/**
 * The document kinds worth offering when the applicant uploads for a given
 * requirement — every smart document that satisfies it, with the most complete
 * (widest coverage) first so the passport surfaces above a license for IDN-01.
 */
export function smartDocumentsForRequirement(reqCode: string): SmartDocument[] {
  return SMART_DOCUMENTS.filter((d) => d.reqCodes.includes(reqCode)).sort(
    (a, b) => b.reqCodes.length - a.reqCodes.length
  )
}

/**
 * Given a chosen document kind and the requirement codes that actually exist and
 * are still outstanding on THIS case, return the subset the document legitimately
 * satisfies. Never returns a code outside the map or off this case.
 */
export function reqCodesForDocumentKind(kind: string, caseReqCodes: string[]): string[] {
  const doc = smartDocument(kind)
  if (!doc) return []
  const onCase = new Set(caseReqCodes)
  return doc.reqCodes.filter((c) => onCase.has(c))
}
