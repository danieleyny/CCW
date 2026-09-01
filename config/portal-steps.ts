/**
 * THE single ordered definition of the NYPD online licensing portal's flow.
 *
 * Staff transcribe the portal step by step; every surface that describes "what the
 * portal wants" — the worksheet builder (lib/disclosures/worksheet-portal.ts), the
 * readiness gate (lib/disclosures/readiness.ts), the disclosure questions
 * (lib/disclosures/portal-questions.ts group into 8/9/10), the Application tab, and
 * the PDF/ZIP exports — DERIVES its order and headings from here.
 *
 * There must be exactly ONE step list. This codebase already shipped a bug from a
 * list copied five times (the Q20a addendum drift); do not add a second. Adding a
 * step is one edit here.
 */

export type StepKind = "fields" | "questions" | "uploads" | "checkpoint"

/** One upload slot as the PORTAL labels it, mapped to our requirement(s). */
export interface PortalUploadSlot {
  /** The portal's own upload label (what the screen calls the slot). */
  portalLabel: string
  /**
   * Requirement codes that can fill this slot. Usually one; a couple of slots take an
   * EITHER/OR pair where the requirements engine materialises exactly one per case —
   * Cohabitant is COH-01 (notarised affidavit) or COH-02 (sole-occupancy attestation),
   * Training is TRN-01 (initial) or RNW-01 (renewal live-fire). An empty list is the
   * Additional Documents catch-all: any leftover portal_upload doc with no named slot.
   */
  reqCodes: string[]
  /** Our document_type for legacy untagged-upload matching (the primary one). */
  documentType?: string
  /** The portal stars this slot as required (a red asterisk). */
  starred: boolean
  /** The portal rejects a PDF here — image only (the Photograph). */
  imageOnly?: boolean
  /** Sanitised base filename for the ZIP upload-set (no extension). */
  zipBase: string
}

export interface PortalStep {
  no: number
  /** The portal's OWN heading for the screen — verbatim, never paraphrased. */
  title: string
  kind: StepKind
  /** `questions` steps: the inclusive disclosure-question number range on this screen. */
  range?: [number, number]
  /** `uploads` step: the portal's upload slots. Rendered only when materialised on the case. */
  slots?: readonly PortalUploadSlot[]
  /** `checkpoint` steps: what the screen asks and what it means (no data to copy). */
  checkpoint?: string
}

/**
 * The portal's 17 steps, in order. Steps 1–14 collect/confirm data or uploads;
 * 15–17 are review/affirm/pay checkpoints with nothing to transcribe.
 */
export const PORTAL_STEPS: readonly PortalStep[] = [
  { no: 1, title: "Verify Your Information", kind: "fields" },
  { no: 2, title: "Residence History", kind: "fields" },
  { no: 3, title: "Employment", kind: "fields" },
  { no: 4, title: "Employment History", kind: "fields" },
  { no: 5, title: "Other Licenses", kind: "fields" },
  { no: 6, title: "Existing Guns", kind: "fields" },
  { no: 7, title: "Safekeeping and Safeguarding", kind: "fields" },
  { no: 8, title: "Questions 1–6", kind: "questions", range: [1, 6] },
  { no: 9, title: "Questions 7–12", kind: "questions", range: [7, 12] },
  { no: 10, title: "Questions 13–16", kind: "questions", range: [13, 16] },
  { no: 11, title: "Confidentiality", kind: "fields" },
  { no: 12, title: "Letter of Necessity", kind: "fields" },
  {
    no: 13,
    title: "Document Uploads",
    kind: "uploads",
    // The live portal's seven upload slots (no citizenship slot — that's an interview
    // document), plus the portal's own "Additional Documents" catch-all.
    slots: [
      { portalLabel: "Photograph", reqCodes: ["PHO-01"], documentType: "applicant_photo", starred: true, imageOnly: true, zipBase: "01-photograph" },
      { portalLabel: "Photo ID", reqCodes: ["IDN-01"], documentType: "id", starred: true, zipBase: "02-photo-id" },
      { portalLabel: "DOB Proof", reqCodes: ["IDN-02"], documentType: "id", starred: true, zipBase: "03-dob-proof" },
      { portalLabel: "Residence Proof", reqCodes: ["RES-01"], documentType: "proof_residence", starred: true, zipBase: "04-residence-proof" },
      { portalLabel: "Safeguard", reqCodes: ["SGI-01"], documentType: "safeguard_id", starred: true, zipBase: "05-safeguard-id" },
      // Portal-starred: one of the notarised affidavit (COH-01) or the sole-occupancy
      // attestation (COH-02) fills it — never both on one case.
      { portalLabel: "Cohabitant", reqCodes: ["COH-01", "COH-02"], documentType: "cohabitant_affidavit", starred: true, zipBase: "06-cohabitant" },
      // Not starred (may follow): initial training cert or the renewal live-fire cert.
      { portalLabel: "Training Documents", reqCodes: ["TRN-01", "RNW-01"], documentType: "training_cert", starred: false, zipBase: "07-training" },
      // Catch-all: any leftover portal_upload document with no named slot is parked here
      // (visible in the tab + ZIP) rather than silently dropped.
      { portalLabel: "Additional Documents", reqCodes: [], starred: false, zipBase: "08-additional" },
    ],
  },
  { no: 14, title: "Counsel and Preparer", kind: "fields" },
  {
    no: 15,
    title: "Verify Your Information",
    kind: "checkpoint",
    checkpoint:
      "A final review screen — nothing new to type. Confirm each section matches what's above before continuing.",
  },
  {
    no: 16,
    title: "Affirmations",
    kind: "checkpoint",
    checkpoint:
      "The applicant checks the affirmation boxes. “Finalize and Submit” here is IRREVERSIBLE — nothing can be edited after this screen.",
  },
  {
    no: 17,
    title: "Payment",
    kind: "checkpoint",
    checkpoint:
      "The portal hands off to NYC CityPay for the application fee. The applicant pays it themselves; we never hold card details or submit payment.",
  },
] as const

/** Every portal upload slot, flattened (from step 13). */
export const PORTAL_UPLOAD_SLOTS: readonly PortalUploadSlot[] =
  PORTAL_STEPS.find((s) => s.kind === "uploads")?.slots ?? []

/**
 * THE required-upload codes — the req_codes on STARRED slots the portal blocks
 * submission without. This is the single source of truth: `lib/disclosures/readiness.ts`
 * imports it; nothing else may declare its own copy (there were three, once).
 */
export const REQUIRED_UPLOAD_CODES: readonly string[] = PORTAL_UPLOAD_SLOTS.filter((s) => s.starred).flatMap(
  (s) => s.reqCodes
)

/** Every req_code claimed by a NAMED slot (used to find leftovers for the catch-all). */
export const CLAIMED_UPLOAD_CODES: readonly string[] = PORTAL_UPLOAD_SLOTS.flatMap((s) => s.reqCodes)

/** Labels of the required (starred) upload slots — for readiness messaging. */
export const REQUIRED_UPLOAD_SLOTS: readonly PortalUploadSlot[] = PORTAL_UPLOAD_SLOTS.filter((s) => s.starred)

/** Which portal step a disclosure question number falls on (8/9/10), or null. */
export function questionStepNo(questionNo: number): number | null {
  const step = PORTAL_STEPS.find((s) => s.kind === "questions" && s.range && questionNo >= s.range[0] && questionNo <= s.range[1])
  return step?.no ?? null
}
