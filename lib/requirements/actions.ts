/**
 * THE requirement → action map: how a customer actually completes each item.
 *
 * Before this file the answer was spread across four hardcoded lists that didn't
 * know about each other (forms/page.tsx display, the switch in forms/[key]/route,
 * SIGNABLE in forms/actions, DOC_TYPES in documents/page). This is the single
 * source the checklist UI, the questionnaire engine, and the generators read.
 *
 * Four modes:
 *   generate — we ask a short questionnaire and produce the finished document
 *   obtain   — an external document we can't produce; we give the steps + the
 *              official link (and a prepared request letter where one helps)
 *   attest   — already answered on-platform (intake) or a simple confirmation
 *   roster   — the document is written and notarized by SOMEBODY ELSE (a
 *              reference, a household member). We collect who they are, send
 *              each of them a private link, and track the notarized copies
 *              coming back. There is no single PDF for the applicant to sign,
 *              which is exactly why routing these through the generator threw
 *              "No generator for COH-01".
 *
 * GUARDRAILS BAKED IN:
 * - `conciergeScope` mirrors `requirements.concierge_scope` in SQL, which is the
 *   SOURCE OF TRUTH — views, policies and RPCs read the column, not this map.
 *   The copy here drives UI wording only, and tests/concierge-scope.test.ts
 *   fails if the two ever disagree.
 *     hidden   — a trainer never learns the item exists (disclosure material)
 *     progress — counts only (documents written by third parties)
 *     full     — the trainer reviews it
 * - `notarize: true` means generation ALONE never satisfies the requirement —
 *   the applicant must upload the notarized copy. See lib/requirements/completion.
 * - Copy states facts and names the agency. No legal advice: questionnaires
 *   collect FACTS, and anything asking "what does MY record mean" routes to the
 *   attorney seam. Candor-maximizing throughout — we never hint at omitting.
 * - We never file. Every "obtain" step ends with the applicant submitting their
 *   own application at licensing.nypdonline.org.
 */
import type { Database } from "@/lib/supabase/types"

type DocumentType = Database["public"]["Enums"]["document_type"]

export type RequirementMode = "generate" | "obtain" | "attest" | "roster"

/**
 * Our own illustrations (components/portal/document-example) — deliberately NOT
 * photographs pulled off the web: a stranger's ID or face carries copyright and
 * privacy exposure this site should never take on.
 */
export type ExampleId = "id-document" | "applicant-photo" | "proof-of-address" | "certificate" | "safe"

interface ActionBase {
  /** Short, retail-voice label for the action button. */
  actionLabel: string
  /** Plain-English what this is and why it's needed. */
  help: string
  /**
   * What to DO, in the words a person would use. The registry title is written
   * for the record ("Photo — square, 600×600–1200×1200 px, taken within 30
   * days"); that's spec-speak to a customer, so the checklist leads with this
   * and keeps the official title underneath as the citation-grade detail.
   */
  customerTitle?: string
  /** Which of our own illustrations shows what "good" looks like. */
  example?: ExampleId
  /** Must be notarized → generation alone never satisfies. */
  notarize?: boolean
  /**
   * Mirrors `requirements.concierge_scope`. SQL is authoritative; this is for
   * copy. Omitted means `full` — but the DATABASE defaults to `hidden`, so an
   * unclassified requirement is invisible to trainers regardless of what this
   * map says. Fail safe lives in SQL, deliberately.
   */
  conciergeScope?: "hidden" | "progress" | "full"
  /** Rendered as optional; the requirement is non-blocking in the registry. */
  optional?: boolean
  /** What an upload binds to (mirrors requirements.document_type). */
  documentType?: DocumentType
  /**
   * A control WE verify, not a task for the customer. Asking someone to
   * "confirm" a thing the system already checks is busywork that also implies
   * they're responsible for it — so these are hidden from the customer checklist
   * and satisfied by the code that does the verifying. Admin/QA still sees them.
   * The string is the note written when the system satisfies it.
   */
  systemVerified?: string
}

interface GenerateAction extends ActionBase {
  mode: "generate"
  /** The questionnaire schema id (lib/requirements/questionnaires). */
  questionnaireId: string
  /** A document we prepare that HELPS obtain the external one (court request letter). */
  companion?: { questionnaireId: string; label: string }
  /**
   * Every generated document carries a signature line and so needs signing —
   * OPT OUT explicitly (worksheets, reference letters signed by someone else).
   * Defaulting to "signable" fails safe: a new document nobody thought about
   * requires a signature rather than silently satisfying unsigned.
   */
  signable?: boolean
}

/**
 * `obtain` REQUIRES documentType, steps and a source. DMV-01 and PRM-01 shipped
 * without a documentType, so the uploader never rendered: the customer was told
 * exactly what to fetch and then had nowhere to put it. Making these required
 * means the compiler catches that class of bug instead of a user finding it.
 */
interface ObtainAction extends ActionBase {
  mode: "obtain"
  documentType: DocumentType
  steps: string[]
  sourceUrl: string
  sourceLabel?: string
  /** Several files are legitimate (e.g. one abstract per state lived in). */
  multiple?: boolean
}

interface AttestAction extends ActionBase {
  mode: "attest"
  /**
   * Some confirmations deserve more than a button. FEE-01 asked people to
   * "Confirm" a paragraph about money they hadn't been shown — this opens a real
   * panel (what's owed, to whom, when, how) and the confirmation then means
   * something. The panel never collects the fees; we legally can't and must not
   * appear to.
   */
  panel?: "fees"
}

/**
 * People-driven requirements. The applicant lists who; each person completes and
 * notarizes their own document through a tokenized link (app/r/[token] for
 * references, app/c/[token] for cohabitants). The requirement completes when the
 * notarized copies are in — never on submitting the list.
 */
interface RosterAction extends ActionBase {
  mode: "roster"
  /** The questionnaire that collects the people. */
  questionnaireId: string
  /** Which roster this manages — picks the table, the token flow and the copy. */
  roster: "references" | "cohabitants"
  /** How many are required (references only; cohabitants is "every adult"). */
  minimum?: number
  /** Deep link to the page that manages invitations and notarized uploads. */
  manageHref: string
}

export type RequirementAction = GenerateAction | ObtainAction | AttestAction | RosterAction

const NYPD_REQUIRED_DOCS = "https://licensing.nypdonline.org/app-instruction/requireddocs"

export const REQUIREMENT_ACTIONS: Record<string, RequirementAction> = {
  // ── attest ────────────────────────────────────────────────────────────────
  "ELG-01": {
    mode: "attest",
    actionLabel: "Confirm",
    systemVerified: "System-verified from the date of birth given at intake.",
    help: "NYC carry licenses require the applicant to be at least 21. Confirmed from your intake date of birth.",
  },
  "ELG-02": {
    mode: "attest",
    actionLabel: "Confirm",
    systemVerified: "System-verified from the address and residence answers given at intake.",
    help: "You must live in NYC or have your principal place of business here — that's what gives the NYPD License Division jurisdiction. Non-residents route to the Special Carry track.",
  },
  "ELG-03": {
    mode: "attest",
    actionLabel: "Confirm",
    systemVerified: "System-verified from the eligibility answers given at intake (no disqualifier reported).",
    help: "No felony or serious-offense conviction, disqualifying mental-health adjudication, active order of protection, or unlawful drug use. Answered in your intake.",
  },
  "FEE-01": {
    mode: "attest",
    panel: "fees",
    actionLabel: "See what you'll owe",
    customerTitle: "Be ready for the NYPD and fingerprint fees",
    help: "Two government fees, both paid by you directly: the application fee to the NYPD License Division on their portal, and the fingerprint fee to the DCJS-approved vendor at your appointment. Neither is ever paid to us. Retired law enforcement: your application fee is waived.",
  },
  "FMT-01": {
    mode: "attest",
    actionLabel: "Confirm",
    systemVerified: "System-verified: every upload is checked for size, type, and filename before it is stored.",
    help: "Uploads must meet the NYPD portal's file limits. We check each file as you upload it.",
  },
  "OOS-02": {
    mode: "attest",
    actionLabel: "Confirm",
    systemVerified: "System-verified from the out-of-state license answers given at intake.",
    help: "Disclose any firearms licenses you hold in other jurisdictions. Answered in your intake.",
  },
  "SPC-01": {
    mode: "attest",
    actionLabel: "Acknowledge",
    optional: true,
    customerTitle: "One thing to know about a Special Carry license",
    help: "A Special Carry license's validity depends on you also holding a license from your home county (38 RCNY §5-25). This is an advisory — nothing to upload.",
  },

  // ── generate ──────────────────────────────────────────────────────────────
  "AFF-01": {
    mode: "generate",
    actionLabel: "Complete & generate",
    questionnaireId: "affirmation",
    documentType: "affirmation_understanding",
    customerTitle: "Read and sign your affirmation of understanding",
    help: "A signed affirmation that you understand NYC's carry rules and where carrying is prohibited. We prepare it from your intake — you review and sign it here.",
  },
  "SAF-01": {
    mode: "generate",
    actionLabel: "Complete & generate",
    questionnaireId: "safe-storage",
    documentType: "safe_photo_closed",
    customerTitle: "Tell us how you'll store the handgun — plus photos of your safe",
    example: "safe",
    help: "How you'll store the handgun safely at home. We prepare your safe-storage statement; you'll also add photos of your safe (open and closed).",
  },
  "SOC-01": {
    mode: "generate",
    actionLabel: "Complete & generate",
    questionnaireId: "social-media",
    documentType: "social_media_list",
    optional: true,
    customerTitle: "Your social media list (optional — you can skip this)",
    help: "The CCIA's social-media disclosure has been enjoined (Antonyuk v. James), so this is OPTIONAL. Some applicants still choose to provide it. Skip it with no effect on your application.",
  },
  "COH-01": {
    conciergeScope: "progress",
    mode: "roster",
    roster: "cohabitants",
    actionLabel: "List your household",
    customerTitle: "A notarized statement from every adult in your home",
    questionnaireId: "cohabitant-affidavit",
    manageHref: "/portal/people?tab=household",
    documentType: "cohabitant_affidavit",
    notarize: true,
    help: "Every household member 18 or older signs a short affidavit acknowledging a licensed firearm in the home, and has it notarized. We send each of them a private link — nothing for you to chase by hand. If you live alone, we prepare a sole-occupancy statement for you to sign instead.",
  },
  "REF-01": {
    conciergeScope: "progress",
    mode: "roster",
    roster: "references",
    minimum: 4,
    actionLabel: "Invite your references",
    customerTitle: "Four people who'll vouch for you",
    questionnaireId: "references",
    manageHref: "/portal/people?tab=references",
    documentType: "reference_letter",
    notarize: true,
    help: "Four character references, at least two not related to you. Each gets a private link to write and notarize their letter. The requirement completes when the notarized letters are in.",
  },
  "REF-02": {
    conciergeScope: "progress",
    mode: "roster",
    roster: "references",
    minimum: 2,
    actionLabel: "Invite your references",
    customerTitle: "Two people who'll vouch for you",
    questionnaireId: "references",
    manageHref: "/portal/people?tab=references",
    documentType: "reference_letter",
    notarize: true,
    help: "Two non-family character references for a premises license. Each gets a private link to write and notarize their letter.",
  },
  "DSC-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Complete disclosures",
    questionnaireId: "disclosure-addendum",
    customerTitle: "Your written explanations for the application's history questions",
    help: "The NYPD application asks questions 10–28 about your history. Every 'yes' needs its own written explanation, submitted on the Handgun License Application Addendum (PD 643-041A). Disclose everything — including sealed, dismissed, or nullified matters. Non-disclosure is more damaging than the underlying event.",
  },
  "QUE-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Write your explanations",
    questionnaireId: "disclosure-addendum",
    customerTitle: "Your written explanations, in your own words",
    help: "One written explanation for each 'yes' answer, in your own words. We turn them into the addendum.",
  },
  "ARR-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Write your statement",
    questionnaireId: "arrest-statements",
    documentType: "certificate_of_disposition",
    companion: { questionnaireId: "court-request-letters", label: "Download court request letter" },
    customerTitle: "Your written statement about each arrest or summons",
    help: "For EVERY arrest or summons — even if it was dismissed, sealed, or nullified (CPL Article 160) — the NYPD wants a Certificate of Disposition from the court plus your written statement of what happened. We write the statement with you and prepare a request letter for the court; the certificate itself comes from the court.",
  },
  "OOP-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Write your statement",
    questionnaireId: "protection-order-statement",
    documentType: "order_of_protection_copy",
    customerTitle: "Your written statement about the order of protection",
    help: "A copy of any order of protection plus your written explanation. Disclose every order, active or expired.",
  },
  "DIR-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Write your statement",
    questionnaireId: "domestic-incident-statement",
    customerTitle: "Your written statement about the domestic incident report",
    help: "A written disclosure of any domestic incident report, in your own words. Disclose it even if no charges followed.",
  },

  // ── obtain ────────────────────────────────────────────────────────────────
  "IDN-01": {
    mode: "obtain",
    actionLabel: "Upload your ID",
    documentType: "id",
    customerTitle: "A clear photo of your driver's license, state ID, or passport",
    example: "id-document",
    help: "A government-issued photo ID.",
    steps: ["Photograph or scan your driver's license, state ID, or passport.", "Make sure all four corners and the text are readable.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "IDN-02": {
    mode: "obtain",
    actionLabel: "Upload proof of birth date",
    documentType: "id",
    customerTitle: "Proof of your date of birth",
    example: "id-document",
    help: "Proof of your date of birth — a birth certificate or passport.",
    steps: ["Locate your birth certificate or passport.", "Scan or photograph the full page.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "IDN-03": {
    mode: "obtain",
    actionLabel: "Upload proof of status",
    documentType: "id",
    customerTitle: "Proof that you're a citizen or lawful permanent resident",
    example: "id-document",
    help: "Proof of U.S. citizenship or lawful status — passport, naturalization certificate, or permanent resident card.",
    steps: ["Find your passport, naturalization certificate, or green card.", "Scan or photograph it in full.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "IDN-04": {
    mode: "obtain",
    actionLabel: "Upload your photo",
    documentType: "applicant_photo",
    customerTitle: "A square photo of you, taken in the last 30 days",
    example: "applicant-photo",
    help: "A passport-style photo that meets the NYPD portal's spec. We check the dimensions for you as you upload.",
    steps: [
      "Get a passport-style photo (any pharmacy does these) or take one against a plain background.",
      "It must be square — between 600×600 and 1200×1200 pixels.",
      "Taken within the last 30 days.",
      "Upload it here — we'll verify the size and shape before it counts.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD photo spec",
  },
  "RES-01": {
    mode: "obtain",
    actionLabel: "Upload proof of residence",
    documentType: "proof_residence",
    customerTitle: "Proof that you live at your NYC address",
    example: "proof-of-address",
    help: "Proof you live at your NYC address. Note: cell phone bills are NOT accepted.",
    steps: [
      "Use a utility bill, lease, bank statement, or government correspondence showing your name and NYC address.",
      "A cell phone bill will not be accepted — pick another document.",
      "Upload it here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "DMV-01": {
    mode: "obtain",
    documentType: "driving_abstract",
    multiple: true, // one abstract per state lived in over the past 5 years
    actionLabel: "Get your driving abstract",
    customerTitle: "Your lifetime driving record — one for every state you've lived in",
    help: "A LIFETIME driving abstract from every state you've lived in over the past five years — not just New York (38 RCNY §5-05(b)(12)).",
    steps: [
      "Order your New York lifetime abstract online from the NYS DMV (about $7).",
      "Choose the LIFETIME abstract — not the standard 3-year one.",
      "If you've lived in another state in the past five years, request that state's abstract too.",
      "Upload each abstract here.",
    ],
    sourceUrl: "https://dmv.ny.gov/records/get-my-own-driving-record-abstract",
    sourceLabel: "NYS DMV — driving records",
  },
  "TRN-01": {
    mode: "obtain",
    actionLabel: "Upload your certificate",
    documentType: "training_cert",
    customerTitle: "Your firearms training certificate",
    example: "certificate",
    help: "The 16-hour classroom plus 2-hour live-fire course required for a carry license. The certificate expires six months after completion, so timing matters — we track the clock.",
    steps: [
      "Book a DCJS-approved instructor — you can find one right here under Find an instructor.",
      "Complete the 16 classroom hours and the 2-hour live-fire session.",
      "Your instructor issues the certificate.",
      "Upload it here. We'll flag it if it's approaching six months old.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "RNW-01": {
    mode: "obtain",
    actionLabel: "Upload your certificate",
    documentType: "training_cert",
    customerTitle: "Your refresher training certificate",
    example: "certificate",
    help: "For a renewal: the 2-hour live-fire certificate, dated within the last six months.",
    steps: ["Book a live-fire session with a DCJS-approved instructor.", "Complete the 2-hour session.", "Upload the certificate here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "MIL-01": {
    mode: "obtain",
    actionLabel: "Upload your DD-214",
    documentType: "dd214",
    customerTitle: "Your DD-214 discharge papers",
    help: "Your military discharge documentation (DD-214).",
    steps: ["Find your DD-214. If you don't have a copy, request one from the National Archives.", "Scan it in full.", "Upload it here."],
    sourceUrl: "https://www.archives.gov/veterans/military-service-records",
    sourceLabel: "National Archives — service records",
  },
  "GMC-01": {
    conciergeScope: "hidden",
    mode: "obtain",
    actionLabel: "Upload the certificate",
    documentType: "cert_good_conduct",
    customerTitle: "Your Certificate of Good Conduct",
    example: "certificate",
    help: "A Certificate of Good Conduct, issued by the NYS Department of Corrections and Community Supervision.",
    steps: ["Apply to NYS DOCCS for a Certificate of Good Conduct.", "Upload the issued certificate here."],
    sourceUrl: "https://doccs.ny.gov/certificates-relief-disabilities-and-good-conduct",
    sourceLabel: "NYS DOCCS — certificates",
  },
  "NAM-01": {
    mode: "obtain",
    actionLabel: "Upload proof of name change",
    documentType: "name_change_proof",
    customerTitle: "Proof of your name change",
    help: "Court-ordered name change, marriage certificate, or divorce decree showing the change.",
    steps: ["Find the court order, marriage certificate, or divorce decree.", "Scan it in full.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "LEO-01": {
    mode: "obtain",
    actionLabel: "Upload the letter",
    documentType: "leo_good_guy_letter",
    customerTitle: "Your department's letter confirming you're in good standing",
    help: 'A "Good Guy" letter (PD 643-155) from your former agency.',
    steps: ["Request the letter from your former agency's records unit.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD retired-officer procedure",
  },
  "LEO-02": {
    mode: "obtain",
    actionLabel: "Upload the receipt",
    documentType: "leo_property_receipt",
    customerTitle: "Your firearm property receipt",
    help: "Your Property Receipt / Discontinuance of Firearms (PD 520-013).",
    steps: ["Request the property receipt from your former agency.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD retired-officer procedure",
  },
  "LEO-03": {
    mode: "obtain",
    actionLabel: "Upload the certificate",
    documentType: "leo_cert_of_service",
    customerTitle: "Your certificate of service",
    example: "certificate",
    help: "A Certificate of Service on your former agency's letterhead.",
    steps: ["Request a certificate of service from your former agency.", "Upload it here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD retired-officer procedure",
  },
  "OOS-01": {
    mode: "obtain",
    actionLabel: "Upload the forms",
    documentType: "oos_background_form",
    customerTitle: "Your out-of-state background check forms",
    help: "An out-of-state background form for every jurisdiction you've lived in over the past five years (38 RCNY §5-03(b), effective 1/5/2025).",
    steps: [
      "List every state and county you've lived in for the past five years.",
      "Request each jurisdiction's background form.",
      "Upload each completed form here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "PRM-01": {
    mode: "obtain",
    documentType: "business_documentation",
    multiple: true,
    actionLabel: "Upload business documents",
    customerTitle: "Paperwork showing your business and its address",
    help: "Business documentation for a premises-business license — incorporation papers, a business certificate, and proof of the business address.",
    steps: ["Gather your incorporation or business certificate.", "Add proof of the business address.", "Upload them here."],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
}

/** The action for a requirement code, or null if the registry has one we don't map yet. */
export function actionFor(reqCode: string): RequirementAction | null {
  return REQUIREMENT_ACTIONS[reqCode] ?? null
}

/**
 * Does this requirement produce a document the APPLICANT signs?
 *
 * Generated documents do unless they explicitly opt out. An upload doesn't — it's
 * evidence they obtained, not something signed here. A references roster doesn't
 * either: each reference signs their own letter.
 *
 * A cohabitants roster is the one that cuts both ways. With housemates, each of
 * them signs their own affidavit. Living alone, it collapses to ONE document the
 * applicant signs themselves — the sole-occupancy statement — so it follows the
 * normal generate → sign → notarize path.
 */
export function isSignable(action: RequirementAction | null): boolean {
  if (!action) return false
  if (action.mode === "generate") return action.signable !== false
  return action.mode === "roster" && action.roster === "cohabitants"
}

/**
 * What a trainer may see. SQL (`requirements.concierge_scope`) is authoritative
 * — this exists so the UI can word things correctly without a round trip.
 */
export function conciergeScopeFor(reqCode: string): "hidden" | "progress" | "full" {
  return REQUIREMENT_ACTIONS[reqCode]?.conciergeScope ?? "full"
}

/** Requirements that need a notarized upload before they can be satisfied. */
export function needsNotarization(reqCode: string): boolean {
  return REQUIREMENT_ACTIONS[reqCode]?.notarize === true
}
