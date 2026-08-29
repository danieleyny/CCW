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
  /**
   * Present ⇒ this requirement is COMPLETED by filling an official PDF we hold
   * (lib/forms/templates), not by rendering our own layout. Its presence is what
   * switches the card from OBTAIN ("go get this") to COMPLETE ("fill it here").
   */
  templateKey?: string
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
  /**
   * A FIXED number of parts that must ALL be present before the item can be
   * considered complete — the guard card's front AND back (2). The checklist
   * shows "1 of 2 uploaded" and never reads the item as fully in until every
   * part is present. `multiple` (unknown count, e.g. one DMV abstract per state)
   * is a separate, softer signal — no fixed target to hit.
   */
  minFiles?: number
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
    help: "Two government fees, both paid by you directly to the NYPD License Division: the application fee when you submit on their portal, and the fingerprint fee in person when NYPD schedules your fingerprinting. Neither is ever paid to us. Retired law enforcement: your application fee is waived.",
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
  // FAM-01 — the official 38 RCNY 5-33 affidavit, filled + NOTARISED (never digitally
  // signed; the notarised paper is what satisfies).
  "FAM-01": {
    mode: "generate",
    actionLabel: "Complete & generate",
    questionnaireId: "affidavit-familiarity",
    templateKey: "nypd_affidavit_familiarity",
    documentType: "affidavit_familiarity",
    notarize: true,
    customerTitle: "Your affidavit of familiarity with the rules and law",
    help: "The official 38 RCNY 5-33 affidavit that you're responsible for knowing the laws that apply to your licence. We fill your county; you sign it before a notary (leave the date for the notary) and upload the notarised copy.",
  },
  // SFG-01 — the official safeguard-person acknowledgement, filled + WITNESSED.
  "SFG-01": {
    mode: "generate",
    actionLabel: "Complete & generate",
    questionnaireId: "safeguard-acknowledgement",
    templateKey: "nypd_safeguard_acknowledgement",
    documentType: "safeguard_acknowledgement",
    notarize: true, // witnessed on paper — never digitally signed
    customerTitle: "The person who will safeguard your firearm(s)",
    help: "The official NYPD acknowledgement for the New York State resident who will safeguard and surrender your firearm(s) if you die or become incapacitated. We fill their details; they sign it before a witness and you upload the completed form.",
  },
  // AFF-02 — the Penal Law Art. 35/265/400 affirmation. Its official PDF is not yet
  // on the platform (owner outstanding), so it's obtain-and-upload for now — a
  // DISTINCT instrument from FAM-01.
  "AFF-02": {
    mode: "obtain",
    actionLabel: "Upload the notarised affirmation",
    documentType: "affirmation_penal_law",
    customerTitle: "Affirmation — Penal Law Articles 35, 265 & 400",
    help: "A separate notarised affirmation that you've read and understand NY Penal Law Articles 35 (justification), 265 (weapons offences) and 400 (licensing). This is distinct from your affirmation of understanding. Your case team provides the official form; sign it before a notary and upload the notarised copy here.",
    steps: [
      "Your case team will send you the official affirmation form.",
      "Read it, then sign it before a notary — don't sign it beforehand.",
      "Upload the notarised copy here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
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
  "COH-02": {
    mode: "generate",
    templateKey: "nypd_cohabitant_affidavit",
    questionnaireId: "sole-occupancy-form",
    documentType: "cohabitant_affidavit",
    signable: true,
    actionLabel: "Complete this form",
    customerTitle: "Your sole-occupancy attestation",
    help: "You live alone, so the official NYPD cohabitant affidavit's solo-resident section applies. We fill it from your details for you to review and sign — under penalty of perjury, no notary needed.",
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
  "LON-01": {
    conciergeScope: "full",
    mode: "generate",
    actionLabel: "Prepare your Letter of Necessity",
    questionnaireId: "letter-of-necessity",
    // Fills the OFFICIAL letter-of-necessity.pdf ("the form provided must be used")
    // AND page 4 of the prepared PD 643-041 from the same six values. Signed with the
    // application at filing, so not signed in-platform (no signature widget).
    templateKey: "nypd_letter_of_necessity",
    signable: false,
    documentType: "letter_of_necessity",
    customerTitle: "Your Letter of Necessity",
    help: "Carry licences for business or professional use require a Letter of Necessity on the NYPD's own form. Answer two questions about your work; the four acknowledgements are pre-filled for you to confirm.",
  },
  // PBR-01 (the uploaded Public Records Exemption) is RETIRED — the live portal fills
  // it INLINE, so we collect the election as data (CON-01), never as an upload.
  "CON-01": {
    conciergeScope: "full",
    mode: "generate",
    actionLabel: "Confidentiality request (optional)",
    questionnaireId: "confidentiality",
    signable: false,
    documentType: "public_records_exemption",
    customerTitle: "Keep your information confidential? (optional)",
    help: "By default a handgun licensee's name, ZIP and licence type are a public record and are released on request. You may ask the License Division to withhold them — the portal collects this on its own page, so we record your answer and enter it for you. Optional.",
  },
  "DSC-01": {
    conciergeScope: "hidden",
    mode: "generate",
    actionLabel: "Answer the disclosure questions",
    questionnaireId: "disclosure-addendum",
    customerTitle: "The application's disclosure questions",
    help: "The NYPD online portal asks seventeen questions about your history, in its own words. Every 'yes' needs a written explanation. Disclose everything — including sealed, dismissed, or nullified matters. Non-disclosure is more damaging than the underlying event.",
  },
  // QUE-01 (the PD 643-041A addendum) is RETIRED — the portal captures explanations
  // inline under each question, so there is no separate addendum form.
  "COR-01": {
    conciergeScope: "full",
    mode: "obtain",
    actionLabel: "Add your Certificate of Relief",
    documentType: "cert_relief_disabilities",
    sourceUrl: "https://ww2.nycourts.gov/",
    steps: [
      "Because you disclosed a felony or serious-offense conviction, obtain an ORIGINAL Certificate of Relief from Disabilities from the court of your conviction (or the Department of Corrections and Community Supervision, if applicable).",
      "It must be the original, signed by the court — a photocopy is not accepted.",
      "Upload the original here so we can include it with your application.",
    ],
    customerTitle: "Certificate of Relief from Disabilities",
    help: "A felony or serious-offense conviction (Penal Law § 265.00(17)) requires an original, signed Certificate of Relief from Disabilities. The License Division will not proceed without it.",
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
  "SSN-01": {
    // Sensitive: hidden from the trainer/sponsor concierge feed, exactly like the
    // disclosure documents. The SSN NUMBER is never asked for here — only the card.
    conciergeScope: "hidden",
    mode: "obtain",
    actionLabel: "Upload your Social Security card",
    documentType: "social_security_card",
    customerTitle: "A clear photo of your Social Security card",
    help: "The NYPD requires your Social Security card for every licence type. Upload a clear photo or scan of the card itself — we don't ask for the number here.",
    steps: [
      "Find your physical Social Security card.",
      "Photograph or scan it so the name and card are fully readable.",
      "Upload it here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
    sourceLabel: "NYPD required documents",
  },
  "PHO-01": {
    mode: "obtain",
    documentType: "applicant_photo",
    actionLabel: "Upload your photograph",
    customerTitle: "A recent passport-type photograph",
    help: "A recent color passport-type photo, front view, taken within the last 30 days (same rules as a U.S. Passport Book). No hats, headgear, or glasses except for religious purposes; head straight; well lit. No selfies. Upload an IMAGE file — a PDF is rejected here.",
    steps: [
      "Take or obtain a passport-style color photo, front view, within the last 30 days.",
      "Remove hats, headgear, and glasses (except for religious purposes); keep your head straight and the background plain.",
      "Save it as an image (jpg, jpeg, png, gif, bmp, or tif) — NOT a PDF.",
      "Upload it here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
  },
  "SGI-01": {
    mode: "obtain",
    documentType: "safeguard_id",
    actionLabel: "Upload the safeguard's ID",
    customerTitle: "Your safeguard person's photo ID",
    help: "A copy of the government-issued photo ID of the person who will safeguard your firearm(s). If you already hold a firearm licence, also upload its front and back.",
    steps: [
      "Get a clear copy of the safeguard person's government-issued photo ID (driver's licence or state ID).",
      "If you already hold a firearm licence, also include its front and back.",
      "Upload it here.",
    ],
    sourceUrl: NYPD_REQUIRED_DOCS,
  },
  "RES-01": {
    mode: "obtain",
    actionLabel: "Upload proof of residence",
    documentType: "proof_residence",
    customerTitle: "Proof that you live at your NYC address",
    example: "proof-of-address",
    // The NYPD online portal's own proof-of-residence list (PORTAL_ALIGNMENT_REBUILD
    // Part 4a): a Utility Bill, Real Estate Tax Bill, ownership in a co-op/condo, a
    // Lease, or a Maintenance Bill. No utility-type restriction and no lease+tax-return
    // pairing — match the portal.
    help: "Proof you live at your NYC address, showing your full name and current NYC address.",
    steps: [
      "Use any ONE of: a utility bill, a real-estate tax bill, proof of ownership in a co-op or condo, a residential lease, or a maintenance bill.",
      "It must show your full name and your NYC address, and be current.",
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
      "Go to the NYS DMV driving-records page and scroll to “Order Your Driver Abstract”.",
      "Sign in with a NY.gov ID — or create one. You'll need your Client ID number OR the document number from the back of your licence, your date of birth, the state and ZIP on file with the DMV, and the last four digits of your Social Security number.",
      "New account: set up two-factor authentication and three security questions.",
      "Choose LIFETIME — NOT Standard. Standard covers only three years and the NYPD will reject it. This is the single most common mistake.",
      "Pay the fee (about $7).",
      "Download the PDF IMMEDIATELY — the DMV only keeps it available in MyDMV for five days after purchase.",
      "Lived in another state in the past five years? Order that state's lifetime abstract too — the NYPD requires one per state (38 RCNY §5-05(b)(12)).",
      "If the online login won't work, use the offline options below — by mail with form MV-15C ($10), or in person at a DMV office.",
      "Upload each abstract here.",
    ],
    sourceUrl: "https://dmv.ny.gov/records/get-my-own-driving-record-abstract",
    sourceLabel: "NYS DMV — driving records",
    // TODO(concierge): optionally generate a pre-filled MV-15C PDF (same identity
    // fields as the email draft) via the document engine so the applicant just
    // prints, signs and mails it. Deferred — the mailto + offline paths (see
    // components/portal/dmv-fallback) unblock people today without new plumbing.
  },
  "TRN-01": {
    mode: "obtain",
    actionLabel: "Upload your certificate",
    documentType: "training_cert",
    customerTitle: "Your firearms training certificate",
    example: "certificate",
    help: "The 18-hour DCJS-approved course required for a carry license — 16 classroom hours plus a 2-hour live-fire session (Penal Law § 400.00(19)). The certificate expires six months after completion, so timing matters — we track the clock.",
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
    actionLabel: "Upload your discharge papers",
    documentType: "dd214",
    customerTitle: "Your military separation and discharge papers",
    // Both are required, not either — the NYPD asks for the DD-214 (separation
    // papers) AND the discharge papers. Two parts; complete only when both are in.
    minFiles: 2,
    help: "Both your DD-214 (separation papers) AND your discharge papers. If you don't have copies, request them from the National Archives.",
    steps: [
      "Find your DD-214 (separation papers) and your discharge papers.",
      "If you don't have a copy of either, request it from the National Archives.",
      "Scan each in full.",
      "Upload both here — this item isn't complete until both are in.",
    ],
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

  // ── Sponsored armed-guard (Carry Guard) — applicant-owned credentials ───────
  // Ordinary paperwork (conciergeScope defaults to full — a trainer can review).
  "GRD-01": {
    mode: "obtain",
    documentType: "security_guard_registration",
    actionLabel: "Upload your guard card",
    customerTitle: "Your NYS security guard registration card (front and back)",
    help: "Your NYS DCJS security guard registration card — clear images of the front and back.",
    steps: ["Find your NYS security guard registration card.", "Photograph or scan the front and back.", "Upload both here."],
    sourceUrl: "https://dos.ny.gov/security-guard",
    sourceLabel: "NYS DOS — security guard",
    minFiles: 2,
  },
  "GRD-02": {
    mode: "obtain",
    documentType: "guard_preassignment_cert",
    example: "certificate",
    actionLabel: "Upload the certificate",
    customerTitle: "Your 8-hour pre-assignment training certificate",
    help: "The certificate for the 8-hour pre-assignment security guard training course.",
    steps: ["Locate your 8-hour pre-assignment certificate.", "Upload it here."],
    sourceUrl: "https://dos.ny.gov/security-guard-training",
    sourceLabel: "NYS DOS — guard training",
  },
  "GRD-03": {
    mode: "obtain",
    documentType: "guard_ojt_cert",
    example: "certificate",
    actionLabel: "Upload the certificate",
    customerTitle: "Your 16-hour on-the-job training certificate",
    help: "The certificate for the 16-hour on-the-job security guard training.",
    steps: ["Locate your 16-hour OJT certificate.", "Upload it here."],
    sourceUrl: "https://dos.ny.gov/security-guard-training",
    sourceLabel: "NYS DOS — guard training",
  },
  "GRD-04": {
    mode: "obtain",
    documentType: "guard_inservice_cert",
    example: "certificate",
    actionLabel: "Upload the certificate",
    customerTitle: "Your current annual 8-hour in-service certificate",
    help: "Proof of the current annual 8-hour in-service security guard training.",
    steps: ["Locate your most recent annual 8-hour in-service certificate.", "Upload it here."],
    sourceUrl: "https://dos.ny.gov/security-guard-training",
    sourceLabel: "NYS DOS — guard training",
  },
  "FRM-01": {
    mode: "obtain",
    documentType: "firearms_course_cert",
    example: "certificate",
    actionLabel: "Upload the certificate",
    customerTitle: "Your 47-hour firearms course certificate",
    help: "The certificate for the 47-hour armed-guard firearms training course.",
    steps: ["Complete the 47-hour armed-guard firearms course with an approved provider.", "Upload the certificate here."],
    sourceUrl: "https://dos.ny.gov/armed-guard-training",
    sourceLabel: "NYS DOS — armed guard",
  },
  "CSC-01": {
    mode: "generate",
    templateKey: "nypd_child_support_cert",
    questionnaireId: "child-support-cert",
    documentType: "child_support_cert",
    signable: true,
    actionLabel: "Complete this form",
    customerTitle: "Your child support certification",
    help: "We fill the official NYPD/HRA child-support certification (Form M-522) from your details — you pick the declaration that applies and sign it. Your Social Security number is used only to fill the form and is never stored.",
  },
  "PLE-01": {
    mode: "generate",
    templateKey: "nypd_prelicense_exemption",
    questionnaireId: "prelicense-exemption",
    documentType: "prelicense_exemption",
    notarize: true, // the form says "MUST BE TYPED AND NOTARIZED" — filled + UNSIGNED, then notary
    signable: false, // never digitally signed on-platform
    actionLabel: "Complete this form",
    customerTitle: "Your pre-licence exemption request (§5-09)",
    help: "We fill your part of the official NYPD Request for License Pre-Exemption. It has to be signed in front of a notary, so we'll set that up after you review it — and your authorised instructor completes and signs their own section on paper.",
  },
  "SCG-01": {
    mode: "obtain",
    documentType: "county_pistol_license",
    actionLabel: "Upload your county licence",
    customerTitle: "Your home-county pistol licence (front and back)",
    help: "Your active pistol licence from your home county — front and back. Special Carry Guard is built on top of it and voids if it lapses.",
    steps: ["Photograph or scan the front and back of your county pistol licence.", "Upload both here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
  },

  // ── Sponsored armed-guard — company packet (party='sponsor', hidden from ────
  // trainers). Uploaded by the sponsoring company's rep on the sponsor surface;
  // on the applicant's checklist these render as progress (row + status only).
  "SPN-01": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "carry_guard_company_form",
    actionLabel: "Upload the company form",
    customerTitle: "Carry Guard company form",
    help: "The company's Carry Guard application form, completed and notarised where required.",
    steps: ["Complete the company's Carry Guard form.", "Notarise it where required.", "Upload it here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
  },
  "SPN-02": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "letter_of_necessity",
    actionLabel: "Upload the letter",
    customerTitle: "Letter of necessity",
    help: "A letter on company letterhead: armed duties, business need, anticipated start date, work locations/assignment type, and at least 20 hours per week.",
    steps: ["Draft the letter of necessity on company letterhead.", "Confirm it states at least 20 hours per week.", "Upload it here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
  },
  "SPN-03": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "sponsor_hours_worksheet",
    actionLabel: "Upload the worksheet",
    customerTitle: "20-hour worksheet",
    help: "A worksheet documenting at least 20 hours per week, consistent with the letter of necessity.",
    steps: ["Complete the 20-hour worksheet.", "Check it against the letter of necessity.", "Upload it here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
  },
  "SPN-04": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "wgp_agency_license",
    actionLabel: "Upload the licence",
    customerTitle: "Watch, Guard or Patrol Agency licence",
    help: "A copy of the company's Watch, Guard or Patrol Agency licence, showing the number and expiry date.",
    steps: ["Locate the company's WGP agency licence.", "Upload a copy showing the number and expiry."],
    sourceUrl: "https://dos.ny.gov/watch-guard-or-patrol-agency",
    sourceLabel: "NYS DOS — WGP agency",
  },
  "SPN-05": {
    conciergeScope: "hidden",
    mode: "attest",
    actionLabel: "Enter custodian details",
    customerTitle: "Gun custodian record",
    help: "The company's designated gun custodian: name, contact, and NYPD licence number. Entered as structured company data, not a file.",
  },
  "SPN-06": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "sponsored_position_confirmation",
    actionLabel: "Upload the confirmation",
    customerTitle: "Sponsored position confirmation",
    help: "Written confirmation of the sponsored position: job title, assignment site, and hours per week.",
    steps: ["Prepare the position confirmation on company letterhead.", "Upload it here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
  },
  "SPN-07": {
    conciergeScope: "hidden",
    mode: "obtain",
    documentType: "firearm_specification",
    optional: true,
    actionLabel: "Upload firearm details",
    customerTitle: "Firearm details (when known)",
    help: "Conditional: company-issued or personal, plus make, model, calibre, serial, and approved storage. Provide once the assigned firearm is known.",
    steps: ["Record the firearm's make, model, calibre, serial, and storage.", "Upload the specification here."],
    sourceUrl: "https://licensing.nypdonline.org/",
    sourceLabel: "NYPD License Division",
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
