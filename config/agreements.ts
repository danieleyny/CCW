/**
 * The concierge engagement agreements — the set an applicant e-signs before the
 * done-for-you dashboard unlocks. This is the SINGLE SOURCE OF TRUTH for the
 * wording, mirrored into `case_agreements` rows (kind + version) when signed. A
 * `version` bump appends a new signed row so the history is a clean audit trail.
 *
 * ⚠️ ATTORNEY REVIEW REQUIRED. The mechanism (versioned + e-signed + audited) is
 * fixed; the EXACT LEGAL WORDING below is a placeholder pending a firearms-attorney
 * pass. Every word here is deliberately honest and NON-representation — it must
 * stay that way. We prepare, organize, check, and guide. The applicant controls the
 * NYPD portal, enters or confirms the information, completes every attestation, pays,
 * and submits. We never request or use portal credentials. Do not add
 * guarantee/expedite/approval-rate language.
 *
 * Versions 3 below replace the contradictory v2 filing language. The version bump
 * requires a fresh signature while preserving the old signed rows for the audit trail.
 */

export const AGREEMENTS = [
  {
    kind: "engagement_limited_scope",
    version: 3,
    title: "Limited-scope preparation engagement",
    summary: "What we do — and the clear line we don't cross.",
    body:
      "Gun License NYC is a licensing consultant, not a law firm and not a government agency. " +
      "Under this engagement we prepare and organize your NYPD handgun-license application: we " +
      "collect your documents, extract and check the data, assemble your packet, and guide you " +
      "through the NYPD portal screen by screen. You keep control of your portal account and login, " +
      "enter or confirm every answer, complete the final acknowledgements, pay, and submit your own " +
      "application. We do NOT request or use your portal credentials, represent you before the NYPD " +
      "License Division, or act as your attorney. This is a limited-scope preparation-and-guidance " +
      "service, not legal representation. If your situation calls for a lawyer, we will tell you " +
      "and can refer you to one.",
  },
  {
    kind: "information_accuracy",
    version: 1,
    title: "Everything you give us must be true",
    summary: "You warrant your information is truthful, accurate, and lawful — and you own that.",
    body:
      "I represent and warrant that all information, documents, statements, and disclosures I " +
      "provide to Gun License NYC — and everything I review and approve in my application — are " +
      "true, accurate, complete, and lawful to the best of my knowledge. I understand that a " +
      "handgun-license application is a filing with a government agency, and that knowingly " +
      "providing false information on such a filing is a crime under New York law, including " +
      "offering a false instrument for filing in the second degree (Penal Law §175.30, a " +
      "misdemeanor) and in the first degree (Penal Law §175.35, a felony where there is intent to " +
      "defraud). I accept sole responsibility for the truthfulness of my information and my " +
      "application. Gun License NYC relies on what I provide, does not independently verify the " +
      "truth of my statements, and is not responsible for any false, inaccurate, incomplete, or " +
      "unlawful information I supply or approve. If I learn that anything I provided is or has " +
      "become inaccurate, I will tell Gun License NYC promptly so it can be corrected.",
  },
  {
    kind: "applicant_files_ack",
    version: 3,
    title: "You control the portal and file your application",
    summary: "We prepare and guide; you enter, review, acknowledge, pay, and submit.",
    body:
      "I authorize Gun License NYC to prepare and organize my NYPD handgun-license application and " +
      "guide me through the published filing process. I understand that I keep control of my NYPD " +
      "portal account and credentials and that I — not Gun License NYC — enter or confirm every " +
      "answer, review the application, complete the final acknowledgements, pay, and submit it. I " +
      "understand this is NOT legal representation and that Gun License NYC will not and cannot " +
      "represent me before the License Division. I personally attest that the information is true. I am " +
      "solely responsible for the truth, accuracy, and completeness of every fact, document, and " +
      "disclosure I give Gun License NYC and everything I approve in my application; Gun License " +
      "NYC prepares based on what I provide and approve, and is not responsible for " +
      "information that is false, inaccurate, incomplete, or unlawful that I supply or approve. I " +
      "acknowledge that no consultant can expedite the NYPD's review.",
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
    version: 2,
    title: "Consent to electronic signatures",
    summary: "Adopt a signature once; approve each document individually.",
    body:
      "I consent to signing documents electronically under the federal ESIGN Act and New York's " +
      "electronic-signature law. I understand I will adopt a signature once, and that my adopted " +
      "signature is applied to a document only when I separately review that document and " +
      "affirmatively approve it — capturing my signature once is consent to a method, not blanket " +
      "authorization. Each electronic signature is recorded with the date, time, and a record of " +
      "the document I approved. My electronic signature will never be applied to documents signed " +
      "by other people before a notary, nor to my NYPD application's certification, which I review " +
      "and sign myself.",
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
