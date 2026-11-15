/**
 * THE single ordered definition of the NYPD online licensing portal's flow.
 *
 * Staff transcribe the portal step by step; every surface that describes "what the
 * portal wants" — the worksheet builder (lib/disclosures/worksheet-portal.ts), the
 * readiness gate (lib/disclosures/readiness.ts), the disclosure questions
 * (lib/disclosures/portal-questions.ts group into 8/9/10 or 9/10/11), the Application
 * tab, and the PDF/ZIP exports — DERIVES its order and headings from here.
 *
 * There must be exactly ONE definition of each track's step list. This codebase already
 * shipped a bug from a list copied five times (the Q20a addendum drift); do not add a
 * second copy of any list. Adding a step is one edit here.
 *
 * TRACK-AWARE. The portal serves a materially different SEQUENCE per licence track — a
 * live walk of a Special Carry application (4 Oct 2026, through finalisation) found not a
 * shift but a different composition: an out-of-city-licence screen inserted at 5, a
 * fee-waiver screen (13) absent from the NYC-resident flow entirely, and the trailing
 * review/affirm/pay screens collapsed. Content attaches to a step by its STABLE `key`,
 * never by its number, because the same screen sits at different numbers per track
 * (Safekeeping is 7 on NYC-resident, 8 on Special Carry). Consumers resolve the list
 * with `portalStepsFor(case.license_track)`.
 */

export type StepKind = "fields" | "questions" | "uploads" | "checkpoint"

/** The portal flows we have modelled. Not the DB `license_track` enum — see `portalStepsFor`. */
export type PortalTrack = "nyc_resident" | "special_carry"

/**
 * Stable step identity. Field sets, notes and readiness attach to a step by KEY, so a
 * screen keeps its content when its NUMBER differs across tracks. Never key logic on the
 * step number.
 */
export type PortalStepKey =
  | "verify_info"
  | "residence"
  | "employment"
  | "employment_history"
  | "other_licenses"
  | "out_of_city"
  | "additional_licenses"
  | "existing_guns"
  | "safekeeping"
  | "questions_1_6"
  | "questions_7_12"
  | "questions_13_16"
  | "confidentiality"
  | "letter_of_necessity"
  | "fee_waiver"
  | "sworn_statements"
  | "uploads"
  | "counsel_preparer"
  | "review"
  | "affirmations"
  | "payment"

/** One upload slot as the PORTAL labels it, mapped to our requirement(s). */
export interface PortalUploadSlot {
  /** The portal's own upload label (what the screen calls the slot). */
  portalLabel: string
  /**
   * Requirement codes that can fill this slot. Usually one; a couple of slots take an
   * EITHER/OR pair where the requirements engine materialises exactly one per case —
   * Cohabitant is COH-01 (notarised affidavit) or COH-02 (sole-occupancy attestation),
   * Training is TRN-01 (initial) or RNW-01 (renewal live-fire). On Special Carry the
   * Safeguard slot ALSO carries the home-county carry licence (SGI-01 or SCG-01). An
   * empty list is the Additional Documents catch-all: any leftover portal_upload doc
   * with no named slot.
   */
  reqCodes: string[]
  /** Our document_type for legacy untagged-upload matching (the primary one). */
  documentType?: string
  /** The portal stars this slot as required (a red asterisk). */
  starred: boolean
  /** The portal rejects a PDF here — image only (the Photograph). */
  imageOnly?: boolean
  /** The portal's own help text for the slot, verbatim where recorded. */
  helpText?: string
  /** Sanitised base filename for the ZIP upload-set (no extension). */
  zipBase: string
}

export interface PortalStep {
  no: number
  /** Stable identity — content attaches here, never to `no`. */
  key: PortalStepKey
  /** The portal's OWN heading for the screen — verbatim, never paraphrased. */
  title: string
  kind: StepKind
  /** `questions` steps: the inclusive disclosure-question number range on this screen. */
  range?: [number, number]
  /** `uploads` step: the portal's upload slots. Rendered only when materialised on the case. */
  slots?: readonly PortalUploadSlot[]
  /** `checkpoint` steps: what the screen asks and what it means (no data to copy). */
  checkpoint?: string
  /** The portal says continuing from this screen cannot be undone. */
  irreversible?: boolean
  /** This screen must be completed by the applicant, never by staff. */
  applicantOnly?: boolean
  /**
   * A `fields` step that is actually a statutory inline form modelled in detail elsewhere
   * (confidentiality → CON-01 questionnaire; fee_waiver → FEE_WAIVER_CATEGORIES;
   * sworn_statements → SWORN_STATEMENTS). Advisory for the renderer.
   */
  form?: "confidentiality" | "fee_waiver" | "sworn_statements"
}

/**
 * Portal file constraints on the Document Uploads screen (both tracks). Not currently
 * enforced by the portal-set builder beyond `zipBase` sanitisation — surfaced so staff
 * downloads never carry a filename the portal rejects.
 */
export const PORTAL_UPLOAD_CONSTRAINTS = {
  maxBytes: 5 * 1024 * 1024,
  maxLabel: "5 MB",
  formats: ["pdf", "tif", "jpg", "jpeg", "gif", "png", "bmp"] as const,
  /** No accents, tildes, or symbols (&, *, #, …) in the filename. */
  filenameRule: "letters, numbers, spaces, hyphens and underscores only — no accents or symbols",
} as const

// The eight upload slots, shared across tracks except for the Safeguard slot (5), which
// on Special Carry also holds the home-county carry licence. Built once; the two tracks
// differ only at that slot so the rest can never drift apart.
const SLOT_PHOTO: PortalUploadSlot = { portalLabel: "Photograph", reqCodes: ["PHO-01"], documentType: "applicant_photo", starred: true, imageOnly: true, helpText: "Passport-style; no hats or glasses except for religious reasons; no selfies; taken within the last 30 days.", zipBase: "01-photograph" }
const SLOT_PHOTO_ID: PortalUploadSlot = { portalLabel: "Photo ID", reqCodes: ["IDN-01"], documentType: "id", starred: true, zipBase: "02-photo-id" }
const SLOT_DOB: PortalUploadSlot = { portalLabel: "DOB Proof", reqCodes: ["IDN-02"], documentType: "id", starred: true, helpText: "Birth certificate, military record, or passport.", zipBase: "03-dob-proof" }
const SLOT_RESIDENCE: PortalUploadSlot = { portalLabel: "Residence Proof", reqCodes: ["RES-01"], documentType: "proof_residence", starred: true, helpText: "Utility bill, real estate tax bill, co-op/condo ownership, lease, or maintenance bill.", zipBase: "04-residence-proof" }
// Portal-starred: one of the notarised affidavit (COH-01) or the sole-occupancy
// attestation (COH-02) fills it — never both on one case.
const SLOT_COHABITANT: PortalUploadSlot = { portalLabel: "Cohabitant", reqCodes: ["COH-01", "COH-02"], documentType: "cohabitant_affidavit", starred: true, helpText: "Notarised; the form is downloadable from the page's Forms link.", zipBase: "06-cohabitant" }
// Not starred (may follow): initial training cert or the renewal live-fire cert.
const SLOT_TRAINING: PortalUploadSlot = { portalLabel: "Training Documents", reqCodes: ["TRN-01", "RNW-01"], documentType: "training_cert", starred: false, helpText: "18-hour DCJS-approved training course (P.L. 400.00(19)).", zipBase: "07-training" }
// Catch-all: any leftover portal_upload document with no named slot is parked here
// (visible in the tab + ZIP) rather than silently dropped.
const SLOT_ADDITIONAL: PortalUploadSlot = { portalLabel: "Additional Documents", reqCodes: [], starred: false, zipBase: "08-additional" }

const SLOT_SAFEGUARD_RESIDENT: PortalUploadSlot = { portalLabel: "Safeguard", reqCodes: ["SGI-01"], documentType: "safeguard_id", starred: true, zipBase: "05-safeguard-id" }
// Special Carry: the same slot's real label folds in "All Firearm Licenses" — this is
// where the home-county carry licence, the document the whole application rests on,
// belongs. The Special Carry portal flow only ever serves the CIVILIAN non-resident case
// (a sponsored armed guard falls back to the resident flow — see portalTrackForCase), so
// the county doc here is SPC-01, the civilian county-licence requirement, not the guard's
// SCG-01. EITHER/OR: SGI-01 (the safeguard's ID) or SPC-01 (the county licence); the
// requirements engine materialises what the case needs. Before this it mapped SGI-01
// only, so a county-licence upload fell through to the Additional Documents catch-all.
const SLOT_SAFEGUARD_SPECIAL_CARRY: PortalUploadSlot = { portalLabel: "Safeguard's Government Issued Photo ID / All Firearm Licenses", reqCodes: ["SGI-01", "SPC-01"], documentType: "safeguard_id", starred: true, helpText: "If you have a firearm license, please include the front and back of your license.", zipBase: "05-safeguard-id" }

const RESIDENT_UPLOAD_SLOTS: readonly PortalUploadSlot[] = [
  SLOT_PHOTO, SLOT_PHOTO_ID, SLOT_DOB, SLOT_RESIDENCE, SLOT_SAFEGUARD_RESIDENT, SLOT_COHABITANT, SLOT_TRAINING, SLOT_ADDITIONAL,
]
const SPECIAL_CARRY_UPLOAD_SLOTS: readonly PortalUploadSlot[] = [
  SLOT_PHOTO, SLOT_PHOTO_ID, SLOT_DOB, SLOT_RESIDENCE, SLOT_SAFEGUARD_SPECIAL_CARRY, SLOT_COHABITANT, SLOT_TRAINING, SLOT_ADDITIONAL,
]

/**
 * The NYC-RESIDENT portal flow, in order. Steps 1–14 collect/confirm data or uploads;
 * 15–17 are review/affirm/pay checkpoints with nothing to transcribe. This is the
 * DEFAULT for any track not otherwise mapped (see `portalStepsFor`).
 */
export const PORTAL_STEPS: readonly PortalStep[] = [
  { no: 1, key: "verify_info", title: "Verify Your Information", kind: "fields" },
  { no: 2, key: "residence", title: "Residence History", kind: "fields" },
  { no: 3, key: "employment", title: "Employment", kind: "fields" },
  { no: 4, key: "employment_history", title: "Employment History", kind: "fields" },
  { no: 5, key: "other_licenses", title: "Other Licenses", kind: "fields" },
  { no: 6, key: "existing_guns", title: "Existing Guns", kind: "fields" },
  { no: 7, key: "safekeeping", title: "Safekeeping and Safeguarding", kind: "fields" },
  { no: 8, key: "questions_1_6", title: "Questions 1–6", kind: "questions", range: [1, 6] },
  { no: 9, key: "questions_7_12", title: "Questions 7–12", kind: "questions", range: [7, 12] },
  { no: 10, key: "questions_13_16", title: "Questions 13–16", kind: "questions", range: [13, 16] },
  { no: 11, key: "confidentiality", title: "Confidentiality", kind: "fields", form: "confidentiality" },
  { no: 12, key: "letter_of_necessity", title: "Letter of Necessity", kind: "fields" },
  { no: 13, key: "uploads", title: "Document Uploads", kind: "uploads", slots: RESIDENT_UPLOAD_SLOTS },
  { no: 14, key: "counsel_preparer", title: "Counsel and Preparer", kind: "fields" },
  {
    no: 15,
    key: "review",
    title: "Verify Your Information",
    kind: "checkpoint",
    checkpoint:
      "A final review screen — nothing new to type. Confirm each section matches what's above before continuing.",
  },
  {
    no: 16,
    key: "affirmations",
    title: "Affirmations",
    kind: "checkpoint",
    checkpoint:
      "The applicant checks the affirmation boxes. “Finalize and Submit” here is IRREVERSIBLE — nothing can be edited after this screen.",
    irreversible: true,
    applicantOnly: true,
  },
  {
    no: 17,
    key: "payment",
    title: "Payment",
    kind: "checkpoint",
    checkpoint:
      "The portal hands off to NYC CityPay for the application fee. The applicant pays it themselves; we never hold card details or submit payment.",
    applicantOnly: true,
  },
] as const

/**
 * The SPECIAL CARRY flow — confirmed by a read-only authenticated live walk on 4 Oct
 * 2026, through the screen immediately before the irreversible action. No answers were
 * changed and Finalize and Pay was not clicked.
 * Diverges from NYC-resident from step 5: an out-of-city-licence screen (5) and an
 * Additional-licenses screen (6) where NYC-resident has a single "Other Licenses"; a
 * fee-waiver screen (13) that does not exist on NYC-resident; step 16 is Counsel and
 * Preparer; step 17 is a PRE-SUBMISSION review; and the portal then exposes a hidden
 * “Step 18 of 17” for five initials + five acknowledgements and Finalize and Pay. Portal
 * headings are verbatim where observed; steps 14 and 18 had no recorded page heading
 * (marked below).
 */
export const SPECIAL_CARRY_STEPS: readonly PortalStep[] = [
  { no: 1, key: "verify_info", title: "Verify Your Information", kind: "fields" },
  { no: 2, key: "residence", title: "Residence History", kind: "fields" },
  { no: 3, key: "employment", title: "Employment", kind: "fields" },
  { no: 4, key: "employment_history", title: "Employment History", kind: "fields" },
  { no: 5, key: "out_of_city", title: "Out of city license information", kind: "fields" },
  { no: 6, key: "additional_licenses", title: "Additional licenses", kind: "fields" },
  { no: 7, key: "existing_guns", title: "Existing Guns", kind: "fields" },
  { no: 8, key: "safekeeping", title: "Safekeeping and Safeguarding", kind: "fields" },
  { no: 9, key: "questions_1_6", title: "Questions 1–6", kind: "questions", range: [1, 6] },
  { no: 10, key: "questions_7_12", title: "Questions 7–12", kind: "questions", range: [7, 12] },
  { no: 11, key: "questions_13_16", title: "Questions 13–16", kind: "questions", range: [13, 16] },
  { no: 12, key: "confidentiality", title: "Confidentiality", kind: "fields", form: "confidentiality" },
  { no: 13, key: "fee_waiver", title: "Law Enforcement Application Fee Waiver", kind: "fields", form: "fee_waiver" },
  // No portal heading was recorded for this screen; title is descriptive and UNVERIFIED.
  { no: 14, key: "sworn_statements", title: "Required Statements", kind: "fields", form: "sworn_statements" },
  { no: 15, key: "uploads", title: "Document Uploads", kind: "uploads", slots: SPECIAL_CARRY_UPLOAD_SLOTS },
  { no: 16, key: "counsel_preparer", title: "Counsel and Preparer", kind: "fields" },
  {
    no: 17,
    key: "review",
    title: "Verify Your Information",
    kind: "checkpoint",
    checkpoint:
      "Pre-submission review only. Use Print to save a review copy and confirm every section. This is NOT proof of filing. Next prompts the applicant to download the required New York State warning, then opens Step 18.",
  },
  {
    no: 18,
    key: "affirmations",
    // No page heading was recorded; every visible field is an Acknowledgement label.
    title: "Acknowledgements",
    kind: "checkpoint",
    checkpoint:
      "Applicant-only boundary: enter five sets of initials, check all five acknowledgements, save the state-mandated warning, and personally click “Finalize and Pay.” Do not share portal credentials and do not let staff perform this step. Finalize and Pay is irreversible.",
    irreversible: true,
    applicantOnly: true,
  },
] as const

/** Evidence/version marker for the Special Carry flow. Re-walk after the announced
 * portal migration instead of silently treating this snapshot as timeless. */
export const SPECIAL_CARRY_FLOW_EVIDENCE = {
  verifiedOn: "2026-10-04",
  method: "Authenticated read-only live draft walkthrough",
  observedThrough: "Step 18 of 17, before Finalize and Pay",
  notObserved: ["Finalize and Pay result", "payment handoff", "post-submission receipt"],
  currentPortalDraftDeadline: "2026-10-16",
} as const

/** Every modelled track's step list. NYC-resident is the default fallback. */
export const PORTAL_STEPS_BY_TRACK: Record<PortalTrack, readonly PortalStep[]> = {
  nyc_resident: PORTAL_STEPS,
  special_carry: SPECIAL_CARRY_STEPS,
}

/**
 * Which portal FLOW a case follows. "Special Carry" is not a `license_track` value — the
 * DB `license_track` enum has no `special_carry`. In this data model the walked Special
 * Carry application is the NON-SPONSORED, NON-RESIDENT individual: `clients.track =
 * 'non_resident'` → the `special_carry` jurisdiction ("Special / Non-Resident Carry"),
 * which is exactly the case the portal walk covered. The requirements engine already
 * keys Special Carry off that jurisdiction, not off `license_track`, so we mirror it.
 *
 * The SPONSORED armed-guard tracks (carry_guard / special_carry_guard / sponsored_
 * unresolved) are a DIFFERENT application that has NOT been walked — they fall back to
 * NYC-resident even when the applicant lives outside the city. So the Special Carry flow
 * is: non-resident AND non-sponsored (`concealed_carry`).
 */
export function portalTrackForCase(input: {
  clientTrack?: string | null
  jurisdictionKey?: string | null
  licenseTrack?: string | null
}): PortalTrack {
  const nonResident = input.jurisdictionKey === "special_carry" || input.clientTrack === "non_resident"
  // Anything other than concealed_carry is a sponsored armed-guard track — not the
  // walked Special Carry; fall back until its own sequence is walked.
  const sponsoredArmed = input.licenseTrack != null && input.licenseTrack !== "concealed_carry"
  return nonResident && !sponsoredArmed ? "special_carry" : "nyc_resident"
}

/**
 * Resolve a PORTAL TRACK (from `portalTrackForCase`) to its step list. Only `special_carry`
 * gets its own list; every other value — including `special_carry_guard`, which has NOT
 * been walked (its portal sequence is unknown) — falls back to the NYC-resident list
 * DELIBERATELY. The fallback is explicit here, never silent: when a flow's real sequence
 * is walked, add it to PORTAL_STEPS_BY_TRACK and map it below, and the guard test will
 * start requiring it. Accepts a raw string too, so a caller may pass a resolved PortalTrack.
 */
export function portalStepsFor(track: string | null | undefined): readonly PortalStep[] {
  switch (track) {
    case "special_carry":
      return SPECIAL_CARRY_STEPS
    // Deliberate fallback to the NYC-resident list (documented above):
    //   special_carry_guard — not yet walked
    //   nyc_resident, concealed_carry, sponsored_unresolved, … — resident-shaped
    default:
      return PORTAL_STEPS
  }
}

// ── Upload-slot helpers ──────────────────────────────────────────────────────
// Track-aware; consumers with a case's license_track in hand call the `*For(track)`
// forms. The bare constants below stay as the NYC-resident defaults for back-compat.

/** The resolved track's upload slots (from its uploads step). */
export function uploadSlotsFor(track: string | null | undefined): readonly PortalUploadSlot[] {
  return portalStepsFor(track).find((s) => s.kind === "uploads")?.slots ?? []
}
/** The resolved track's STARRED required-upload req_codes. */
export function requiredUploadCodesFor(track: string | null | undefined): readonly string[] {
  return uploadSlotsFor(track).filter((s) => s.starred).flatMap((s) => s.reqCodes)
}
/** The resolved track's STARRED required-upload slots (for readiness messaging). */
export function requiredUploadSlotsFor(track: string | null | undefined): readonly PortalUploadSlot[] {
  return uploadSlotsFor(track).filter((s) => s.starred)
}
/** Every req_code claimed by a NAMED slot on the resolved track (leftover detection). */
export function claimedUploadCodesFor(track: string | null | undefined): readonly string[] {
  return uploadSlotsFor(track).flatMap((s) => s.reqCodes)
}

/** Every upload slot across ALL tracks, de-duplicated by portalLabel — for surfaces with
 *  NO single case's track in scope (the cross-case reminders sweep, the zipBase lookup). */
export const ALL_UPLOAD_SLOTS: readonly PortalUploadSlot[] = (() => {
  const byLabel = new Map<string, PortalUploadSlot>()
  for (const list of Object.values(PORTAL_STEPS_BY_TRACK)) {
    for (const slot of list.find((s) => s.kind === "uploads")?.slots ?? []) {
      if (!byLabel.has(slot.portalLabel)) byLabel.set(slot.portalLabel, slot)
    }
  }
  return [...byLabel.values()]
})()

/** Union of every track's STARRED required-upload req_codes (the reminders sweep runs
 *  across all concierge cases at once, with no single track in hand — a superset is
 *  correct: a rejected required upload on any track is caught). */
export const ALL_REQUIRED_UPLOAD_CODES: readonly string[] = [
  ...new Set(Object.keys(PORTAL_STEPS_BY_TRACK).flatMap((t) => requiredUploadCodesFor(t as PortalTrack))),
]

// ── NYC-resident back-compat constants (unchanged meaning) ───────────────────

/** Every portal upload slot on the NYC-resident flow, flattened. */
export const PORTAL_UPLOAD_SLOTS: readonly PortalUploadSlot[] = uploadSlotsFor("nyc_resident")

/**
 * THE required-upload codes on the NYC-resident flow. `lib/disclosures/readiness.ts`
 * resolves per-track via `requiredUploadCodesFor`; this stays for callers without a track.
 */
export const REQUIRED_UPLOAD_CODES: readonly string[] = requiredUploadCodesFor("nyc_resident")

/** Every req_code claimed by a NAMED slot on the NYC-resident flow. */
export const CLAIMED_UPLOAD_CODES: readonly string[] = claimedUploadCodesFor("nyc_resident")

/** Labels of the required (starred) NYC-resident upload slots — for readiness messaging. */
export const REQUIRED_UPLOAD_SLOTS: readonly PortalUploadSlot[] = requiredUploadSlotsFor("nyc_resident")

/** Which portal step a disclosure question number falls on, on the given track (default
 *  NYC-resident). The question RANGES are identical across tracks; only the step number
 *  differs (8/9/10 on NYC-resident, 9/10/11 on Special Carry). */
export function questionStepNo(questionNo: number, track: string | null | undefined = "nyc_resident"): number | null {
  const step = portalStepsFor(track).find((s) => s.kind === "questions" && s.range && questionNo >= s.range[0] && questionNo <= s.range[1])
  return step?.no ?? null
}
