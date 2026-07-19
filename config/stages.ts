/**
 * The 13-stage NYC CCW application journey. The `key` values mirror the
 * Postgres `case_stage` enum exactly (see supabase/migrations). This array is
 * ordered and drives the admin pipeline columns and the client progress timeline.
 */

export const CASE_STAGES = [
  {
    key: "lead",
    order: 1,
    label: "Lead / Inquiry",
    short: "Lead",
    description: "Prospect reached out or completed the eligibility quiz.",
    clientHint: "Tell us a bit about yourself so we can confirm you qualify.",
  },
  {
    key: "eligibility_screened",
    order: 2,
    label: "Eligibility Screened",
    short: "Eligibility",
    description: "Age, residency/business, and disqualifier screen complete.",
    clientHint: "Review your eligibility result and choose your package.",
  },
  {
    key: "signed_up_paid",
    order: 3,
    label: "Signed Up & Paid",
    short: "Signed Up",
    description: "Client has enrolled and paid the deposit or full fee.",
    clientHint: "You're enrolled — let's get your training scheduled.",
  },
  {
    key: "training_scheduled",
    order: 4,
    label: "Training Scheduled",
    short: "Training Set",
    description: "Classroom + live-fire dates booked with an instructor.",
    clientHint: "Attend your scheduled 16-hour class and 2-hour range session.",
  },
  {
    key: "training_complete",
    order: 5,
    label: "Training Complete",
    short: "Trained",
    description: "16hr classroom + 2hr live-fire done; written test passed (≥80%).",
    clientHint: "Great work — now we collect your application documents.",
  },
  {
    key: "document_collection",
    order: 6,
    label: "Document Collection",
    short: "Documents",
    description:
      "References, cohabitant affidavits, social media list, safe photos, ID, proof of residence.",
    clientHint: "Upload your required documents from your checklist.",
  },
  {
    key: "notarization",
    order: 7,
    label: "Notarization",
    short: "Notarize",
    description: "Character references and cohabitant affidavits notarized.",
    clientHint: "Get your references and affidavits notarized and uploaded.",
  },
  {
    key: "application_assembled",
    order: 8,
    label: "Application Assembled & QA'd",
    short: "Assembled",
    description: "Full application packet assembled and quality-checked.",
    clientHint: "We're reviewing your packet for accuracy before filing.",
  },
  {
    key: "filed",
    order: 9,
    label: "Filed on NYPD Portal",
    short: "Filed",
    description: "Application submitted on the NYPD Licensing portal.",
    clientHint: "Your application has been filed with the NYPD.",
  },
  {
    key: "fingerprinting_booked",
    order: 10,
    label: "Fingerprinting / Interview Booked",
    short: "Fingerprinting",
    description: "In-person fingerprinting and License Division interview scheduled.",
    clientHint: "Attend your fingerprinting and in-person interview.",
  },
  {
    key: "under_investigation",
    order: 11,
    label: "Under NYPD Investigation",
    short: "Investigation",
    description: "Background check and good-moral-character investigation underway.",
    clientHint: "The NYPD is reviewing your application (typically ~6 months total).",
  },
  {
    key: "decision",
    order: 12,
    label: "Decision",
    short: "Decision",
    description: "NYPD has issued a decision on the application.",
    clientHint: "A decision has been issued on your application.",
  },
  {
    key: "licensed",
    order: 13,
    label: "Licensed / Renewal Due",
    short: "Licensed",
    description: "License issued (3-year term). Renewal tracked automatically.",
    clientHint: "You're licensed! We'll remind you well before renewal.",
  },
] as const

export type CaseStageKey = (typeof CASE_STAGES)[number]["key"]

export const STAGE_KEYS = CASE_STAGES.map((s) => s.key) as CaseStageKey[]

export const STAGE_BY_KEY: Record<CaseStageKey, (typeof CASE_STAGES)[number]> =
  Object.fromEntries(CASE_STAGES.map((s) => [s.key, s])) as Record<
    CaseStageKey,
    (typeof CASE_STAGES)[number]
  >

export function stageMeta(key: CaseStageKey) {
  return STAGE_BY_KEY[key]
}

export function stageIndex(key: CaseStageKey): number {
  return STAGE_BY_KEY[key].order - 1
}

/** The next stage in the pipeline, or null if already at the final stage. */
export function nextStage(key: CaseStageKey): CaseStageKey | null {
  const i = stageIndex(key)
  return i < CASE_STAGES.length - 1 ? CASE_STAGES[i + 1].key : null
}

/** Percentage (0–100) of the journey complete at a given stage. */
export function stageProgress(key: CaseStageKey): number {
  return Math.round((STAGE_BY_KEY[key].order / CASE_STAGES.length) * 100)
}

/**
 * Stages where the clock belongs to the NYPD, not to us or the applicant. The
 * timeline marks these honestly — we never imply we can speed them up, because
 * we can't, and claiming otherwise is exactly the overclaim the guardrails ban.
 */
export const NYPD_CONTROLLED_STAGES: CaseStageKey[] = [
  "filed",
  "fingerprinting_booked",
  "under_investigation",
  "decision",
]

export function isNypdControlled(key: CaseStageKey): boolean {
  return NYPD_CONTROLLED_STAGES.includes(key)
}

/** NYC boroughs + the non-resident business track destinations. */
export const BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "The Bronx",
  "Staten Island",
] as const
export type Borough = (typeof BOROUGHS)[number]

export const CLIENT_TRACKS = [
  { key: "resident", label: "NYC Resident" },
  { key: "business", label: "NYC Business Owner" },
  { key: "non_resident", label: "Non-Resident (Special Carry)" },
] as const
export type ClientTrack = (typeof CLIENT_TRACKS)[number]["key"]
