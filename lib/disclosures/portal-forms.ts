/**
 * Statutory inline forms the NYPD portal renders as their own screens on the Special
 * Carry flow — the fee-waiver election (step 13) and the required sworn statements
 * (step 14). Modelled as data so the staff Application tab shows exactly what the portal
 * will ask, in the portal's own words. These are legal text: never paraphrase.
 *
 * Referenced from `config/portal-steps.ts` via `PortalStep.form` and rendered by
 * `lib/disclosures/worksheet-portal.ts`.
 */

/**
 * Step 13 — Law Enforcement Application Fee Waiver. A qualifying retired officer is
 * exempt from the $340 application fee, so a case that qualifies should be flagged
 * BEFORE anyone quotes a price (see `lib/fees.ts` + intake `isRetiredLeo`). The portal
 * offers these as radio options; verbatim, with the citation the portal shows.
 */
export interface FeeWaiverCategory {
  value: string
  label: string
  /** The CPL citation the portal prints beside the option. */
  cite: string
}
export const FEE_WAIVER_CATEGORIES: readonly FeeWaiverCategory[] = [
  { value: "police_nys", label: "Retired police officers from NYS agencies", cite: "CPL 1.20(34)" },
  { value: "tbta", label: "Retired NYS TBTA police officers, sergeants, lieutenants", cite: "CPL 2.10(20)" },
  { value: "correction", label: "Retired correction officers (including officers employed by NYC)", cite: "CPL 2.10(25)" },
  { value: "sheriff_nyc", label: "Retired sheriffs, undersheriffs, deputy sheriffs of the City of New York", cite: "CPL 2.10(2)" },
  { value: "court_officer", label: "Retired NYS uniformed court officers", cite: "CPL 2.10(21a)" },
  { value: "court_clerk", label: "Retired NYS court clerks, 1st and 2nd judicial departments", cite: "CPL 2.10(21b)" },
  { value: "none", label: "None of these categories apply to me", cite: "" },
] as const

/**
 * Step 14 — five required sworn-statement boxes. The portal renders ALL FIVE with a
 * required marker regardless of the applicant's track; whether it actually BLOCKS on the
 * ones that don't apply to a given track is UNVERIFIED — do not assert either way.
 *
 * `appliesTo` records which licence types each box is addressed to (the portal's own
 * scoping text), so the tab can grey a box that doesn't apply to this applicant while
 * still showing it. `prefillFrom` names an ApplicationValues key when the box duplicates
 * data collected elsewhere — box 2 is the same safekeeping free-text as step 8, so it is
 * collected once and populated in both places.
 */
export interface SwornStatement {
  no: number
  /** The portal's scoping label — who the box is addressed to. Verbatim. */
  appliesTo: string
  /** What the box asks, in the portal's words. */
  text: string
  /** ApplicationValues key to prefill from, when the box duplicates earlier data. */
  prefillFrom?: string
  /** True when the box does NOT apply to a Special Carry applicant (still shown, greyed). */
  notForSpecialCarry?: boolean
}
export const SWORN_STATEMENTS: readonly SwornStatement[] = [
  { no: 1, appliesTo: "Carry Guard/Security only", text: "The handgun is carried only during, and strictly in connection with, the job.", notForSpecialCarry: true },
  { no: 2, appliesTo: "All applicants", text: "The manner in which the handgun will be secured when not in use.", prefillFrom: "safeguardMethod" },
  { no: 3, appliesTo: "Concealed Carry, Special Carry, Carry Guard/Security", text: "The applicant has been trained or will receive training in the use and safety of a handgun." },
  { no: 4, appliesTo: "Carry Guard/Security only", text: "The employer's (or self-employed applicant's) duty to dispose of the handgun and return the licence on termination.", notForSpecialCarry: true },
  { no: 5, appliesTo: "All applicants", text: "The applicant has read and is familiar with Penal Law Articles 35 (deadly force), 265 (criminal possession and use), and 400 (licensee responsibilities)." },
] as const
