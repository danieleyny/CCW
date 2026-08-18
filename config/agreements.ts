/**
 * The concierge engagement agreements — the set an applicant e-signs before the
 * done-for-you dashboard unlocks. This is the SINGLE SOURCE OF TRUTH for the
 * wording, mirrored into `case_agreements` rows (kind + version) when signed. A
 * `version` bump appends a new signed row so the history is a clean audit trail.
 *
 * ⚠️ ATTORNEY REVIEW REQUIRED. The mechanism (versioned + e-signed + audited) is
 * fixed; the EXACT LEGAL WORDING below is a placeholder pending a firearms-attorney
 * pass. Every word here is deliberately honest and NON-representation — it must
 * stay that way: we prepare and organize, the applicant files their own
 * application, we never represent, expedite, or guarantee. Do not add
 * guarantee/expedite/approval-rate language.
 */

export const AGREEMENTS = [
  {
    kind: "engagement_limited_scope",
    version: 1,
    title: "Limited-scope preparation engagement",
    summary: "What we do — and the clear line we don't cross.",
    body:
      "Gun License NYC is a licensing consultant, not a law firm and not a government agency. " +
      "Under this engagement we prepare and organize your NYPD handgun-license application: we " +
      "collect your documents, extract and check the data, assemble your packet, and give you a " +
      "copy-and-paste worksheet for the NYPD online application. We do NOT represent you before " +
      "the NYPD License Division, we do NOT file or submit your application for you, and we do NOT " +
      "appear at your fingerprinting or interview. Those steps are yours to do, and we tell you " +
      "exactly how. This is a limited-scope preparation service, not legal representation. If your " +
      "situation calls for a lawyer, we will tell you and can refer you to one.",
  },
  {
    kind: "applicant_files_ack",
    version: 1,
    title: "You file your own application",
    summary: "By NYPD rule, only you (or a NY-licensed attorney) can file.",
    body:
      "I understand that I — the applicant — submit my own application through the NYPD's online " +
      "licensing portal, and that Gun License NYC cannot and will not file it, submit it, or " +
      "represent me before the License Division. Gun License NYC prepares everything up to the " +
      "point of filing; the final submission, and attending fingerprinting and any interview, are " +
      "mine to complete. I acknowledge that no consultant can expedite the NYPD's review.",
  },
  {
    kind: "no_guarantee_ack",
    version: 1,
    title: "No guarantee of any outcome",
    summary: "We do the preparation well; the decision is the NYPD's.",
    body:
      "I understand that the decision to grant or deny a handgun license belongs solely to the " +
      "NYPD License Division, and that Gun License NYC makes no promise, guarantee, or " +
      "representation about the outcome, the approval odds, or the timeline of my application. " +
      "The service I am paying for is thorough, accurate preparation and organization — not a " +
      "result.",
  },
  {
    kind: "privacy_authorization",
    version: 1,
    title: "Authorization to handle your information",
    summary: "How we store and use the sensitive information you send us.",
    body:
      "I authorize Gun License NYC to collect, store, and use the personal and sensitive " +
      "information I provide — including identity documents, addresses, and any disclosures — for " +
      "the sole purpose of preparing my application. This information is stored privately and " +
      "encrypted, is accessible only to my assigned concierge team, and is never sold or shared " +
      "except as needed to prepare my application or as required by law. I may request its " +
      "deletion in line with the posted retention policy.",
  },
  {
    kind: "esign_consent",
    version: 1,
    title: "Consent to electronic signatures",
    summary: "Adopt a signature once; approve each document individually.",
    body:
      "I consent to signing documents electronically under the federal ESIGN Act and New York's " +
      "electronic-signature law. I understand I will adopt a signature once, and that my adopted " +
      "signature is applied to a document only when I separately review that document and " +
      "affirmatively approve it — capturing my signature once is consent to a method, not blanket " +
      "authorization. Each electronic signature is recorded with the date, time, and a record of " +
      "the document I approved. My electronic signature will never be applied to documents signed " +
      "by other people before a notary, nor to my NYPD application, which I sign and submit myself.",
  },
] as const

export type AgreementKind = (typeof AGREEMENTS)[number]["kind"]

export type Agreement = (typeof AGREEMENTS)[number]

export const AGREEMENT_BY_KIND: Record<AgreementKind, Agreement> = Object.fromEntries(
  AGREEMENTS.map((a) => [a.kind, a])
) as Record<AgreementKind, Agreement>

export function agreementByKind(kind: AgreementKind): Agreement {
  return AGREEMENT_BY_KIND[kind]
}

/** Every agreement kind gates the concierge dashboard — all must be signed. */
export const REQUIRED_AGREEMENT_KINDS = AGREEMENTS.map((a) => a.kind) as AgreementKind[]

/** The current config version for a kind — a signed row at this version = current. */
export function currentAgreementVersion(kind: AgreementKind): number {
  return AGREEMENT_BY_KIND[kind].version
}
