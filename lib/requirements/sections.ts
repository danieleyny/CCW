/**
 * THE ONE TAXONOMY. Requirements are grouped by what the person must DO and about
 * WHOM — never by document type (that's how the database thinks, not how a human
 * does). Grouping lives HERE, in the registry, so every surface — the concierge
 * vault, /portal/documents, the self-guided checklist and the sponsor page —
 * groups identically instead of each re-deriving it.
 *
 * A requirement with no section is a BUILD ERROR (tests/requirement-actions.test
 * asserts every REQUIREMENT_ACTIONS code has one), not a silent fallthrough into
 * an "other" bucket.
 */

export type SectionKey =
  | "identity"
  | "residence"
  | "records"
  | "credentials"
  | "training"
  | "people"
  | "prepared"
  | "conditional"
  | "sponsor"
  | "admin"

export interface SectionDef {
  key: SectionKey
  title: string
  /** One line of context, shown under the section header. */
  blurb: string
  /** Hidden from applicants entirely (system-verified controls). */
  hidden?: boolean
}

/**
 * ORDER IS MEANINGFUL, not alphabetical: what only they can do comes before what
 * we do, and what depends on other people comes before what depends on nobody.
 * identity → residence → records → credentials/training → people → prepared →
 * conditional → sponsor. `admin` is hidden and never rendered.
 */
export const SECTIONS: SectionDef[] = [
  { key: "identity", title: "Who you are", blurb: "Proof of your identity — a photo ID covers several of these at once." },
  { key: "residence", title: "Where you live", blurb: "Proof of your NYC address." },
  { key: "records", title: "Records about you", blurb: "Official records you request from an agency." },
  { key: "credentials", title: "Your guard credentials", blurb: "Your NYS security-guard registration and firearms training." },
  { key: "training", title: "Your training", blurb: "Your firearms-safety course certificate." },
  {
    key: "people",
    title: "People we contact for you",
    blurb: "You give us names and emails. We invite them, chase them, and collect the notarised documents.",
  },
  {
    key: "prepared",
    title: "We prepare, you sign",
    blurb: "We draft these from your answers. You review each one and add your signature — nothing is signed for you.",
  },
  { key: "conditional", title: "Only if it applies to you", blurb: "Extra items a few applicants need — most people won't see these." },
  { key: "sponsor", title: "From your sponsor", blurb: "{company} handles these. You can see the status; the documents themselves are theirs." },
  // Concierge surfaces HIDE this section (staff handle it). The self-guided
  // checklist DOES show it — after its own system-verified filter removes ELG-*/
  // FMT-01, what's left is fees + sign-off attests — so the title reads for that
  // context. (hidden only affects surfaces that honour the flag.)
  { key: "admin", title: "Fees & sign-offs", blurb: "Fees you pay directly, and confirmations.", hidden: true },
]

export const SECTION_BY_KEY: Record<SectionKey, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s])
) as Record<SectionKey, SectionDef>

/** Fixed render order index (lower = earlier). Admin is last / hidden. */
export const SECTION_ORDER: Record<SectionKey, number> = Object.fromEntries(
  SECTIONS.map((s, i) => [s.key, i])
) as Record<SectionKey, number>

/**
 * req_code → section. Every code in REQUIREMENT_ACTIONS must appear here (the
 * requirement-actions test fails otherwise). Prefixes cover the family; specific
 * codes override.
 */
const SECTION_BY_CODE: Record<string, SectionKey> = {
  // Who you are
  "IDN-01": "identity", "IDN-02": "identity", "IDN-03": "identity", "IDN-04": "identity",
  "SSN-01": "identity",
  // Where you live
  "RES-01": "residence",
  // Records about you
  "DMV-01": "records", "OOS-01": "records",
  // Guard credentials (armed track)
  "GRD-01": "credentials", "GRD-02": "credentials", "GRD-03": "credentials", "GRD-04": "credentials",
  "FRM-01": "credentials", "PLE-01": "credentials", "SCG-01": "credentials",
  // Training (non-armed tracks)
  "TRN-01": "training", "RNW-01": "training",
  // People we contact
  "REF-01": "people", "REF-02": "people", "COH-01": "people", "COH-02": "people", "SAF-01": "people",
  // We prepare, you sign
  "AFF-01": "prepared", "AFF-02": "prepared", "FAM-01": "prepared", "SFG-01": "prepared",
  "LON-01": "prepared", "PBR-01": "prepared",
  "DSC-01": "prepared", "QUE-01": "prepared", "ARR-01": "prepared",
  "OOP-01": "prepared", "DIR-01": "prepared", "SOC-01": "prepared", "CSC-01": "prepared",
  // Only if it applies
  "MIL-01": "conditional", "NAM-01": "conditional", "GMC-01": "conditional", "PRM-01": "conditional",
  "LEO-01": "conditional", "LEO-02": "conditional", "LEO-03": "conditional",
  // From the sponsor
  "SPN-01": "sponsor", "SPN-02": "sponsor", "SPN-03": "sponsor", "SPN-04": "sponsor",
  "SPN-05": "sponsor", "SPN-06": "sponsor", "SPN-07": "sponsor",
  // System-verified (hidden from applicants)
  "ELG-01": "admin", "ELG-02": "admin", "ELG-03": "admin", "FMT-01": "admin",
  "FEE-01": "admin", "OOS-02": "admin", "SPC-01": "admin",
}

/** The section a requirement belongs to, or null if unmapped (a build error). */
export function sectionFor(reqCode: string): SectionKey | null {
  return SECTION_BY_CODE[reqCode] ?? null
}

/**
 * The disclosure / history family — arrest, order-of-protection, domestic-incident,
 * the disclosure questionnaire, good-conduct, social-media, military, name-change,
 * out-of-state. These are handled in the dedicated "Your disclosures" surface, not
 * mixed into "Review & file" (several of them land in the `prepared` section, which
 * also holds non-disclosure items like the affirmation — so section alone can't
 * separate them). Preserves the old applicantGroup "history" grouping exactly.
 */
const DISCLOSURE_PREFIXES = ["DSC", "ARR", "OOP", "DIR", "QUE", "GMC", "SOC", "MIL", "NAM", "OOS"]
export function isDisclosureItem(reqCode: string): boolean {
  return DISCLOSURE_PREFIXES.includes(reqCode.split("-")[0])
}
