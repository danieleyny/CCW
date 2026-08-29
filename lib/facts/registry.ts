/**
 * THE fact registry — one catalogue of every reusable fact about the people on a
 * case. A questionnaire field or a form map references a fact by KEY; the resolver
 * (lib/facts/resolve) returns the canonical value. No fact is defined twice under
 * two names.
 *
 * `from` extracts the value from the intake/clients/sponsors records — used to
 * backfill case_facts and as a fallback before a fact has its own row. `derive`
 * computes a read-only value from other facts (a full name, a split date). SSN is
 * registered but NEVER lives in case_facts — it is handled by lib/facts/ssn.
 */
import type { WizardAnswers } from "@/lib/intake/answers"

export type FactType = "text" | "date" | "phone" | "zip" | "select"
export type FactGroup = "you" | "address" | "contact" | "physical" | "employer" | "sponsor" | "safeguard" | "safekeeping" | "counsel" | "addressSplit"

export interface FactSource {
  intake: WizardAnswers
  client: { fullName: string; email: string | null; phone: string | null; borough: string | null; zip: string | null }
  sponsor: {
    legalName: string | null
    agencyLicenseNumber: string | null
    agencyLicenseExpiry: string | null
    custodianName: string | null
    custodianLicenseNumber: string | null
    businessStreet: string | null
    businessCity: string | null
    businessState: string | null
    businessZip: string | null
    businessPhone: string | null
    businessType: string | null
  } | null
}

export interface FactDef {
  key: string
  label: string
  type: FactType
  group: FactGroup
  sensitive?: boolean
  /** Sponsor-owned facts (the agency licence, custodian) are the sponsor's to set. */
  owner?: "applicant" | "sponsor"
  /** A closed answer set — rendered as a select so the value can't vary in spelling
   *  before it reaches a sworn form. Only for genuinely fixed sets. */
  options?: string[]
  /** Shows the expected SHAPE in an empty input (never the label again). */
  placeholder?: string
  /** Not required of everyone (an alias only if you have one; an alien-registration
   *  number only for a permanent resident). Shown with an "only if it applies" chip
   *  and never counted against completeness. */
  optional?: boolean
  /** Backfill / fallback source. */
  from?: (s: FactSource) => string | null | undefined
  /** Read-only value computed from other facts at resolve time. */
  derive?: (get: (k: string) => string) => string
  /** Kept for read/backfill but NOT shown in the details editor — a legacy field
   *  superseded by a structured replacement (e.g. the combined safeguard name). */
  hidden?: boolean
  /** A collapsed "Show me an example" under an abstract field — a real, complete
   *  sample answer modelling the level of detail expected. */
  example?: string
  /** CONDITIONAL visibility — the field is HIDDEN unless another fact holds one of
   *  these values (evaluated client-side against live values). A hidden conditional
   *  field is excluded from the completeness count and from readiness. When it IS
   *  shown it is required (no "only if it applies" tag). */
  showWhen?: { key: string; equals: string[] }
  /** Shown only when the case is a renewal (cases.is_renewal) — a server gate, not a
   *  guess from the applicant. */
  renewalOnly?: boolean
}

// The legal name is NEVER inferred from a display name or an email address
// (3F). clients.full_name can carry whatever was set at sign-up — including an
// email — so a value that looks email-like yields no name at all. The real legal
// name comes from case_facts, confirmed against an identity document / the
// applicant; until then legalFirstName/legalLastName resolve empty and the
// completeness gate + the details screen show them as still-needed.
const looksLikeEmail = (v: string) => /\S+@\S+\.\S+/.test(v) || v.includes("@")
const nameParts = (full: string) => (looksLikeEmail(full) ? [] : full.trim().split(/\s+/).filter(Boolean))

// ── The NYPD portal's exact closed-list values (PORTAL_ALIGNMENT_REBUILD Part 2).
//    Free-typed values become transcription errors; these must match the portal.
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC",
  "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]
// The portal's Industry list — exact strings, their typos ("INSTALLLER") included.
const INDUSTRIES = [
  "ACCOUNTING FIRM", "ALARM INSTALLLER", "ARMORED CAR CARRIER", "ART DEALER", "AUTHORIZED PROPRIETARY",
  "AUTOMOBILE REPAIR", "BAIL ENFORCEMENT AGENT", "BANK", "CAR DEALERSHIP", "CK CASHING - AUTH TO HIRE EMPLOYEES",
  "CK CASHING - NOT AUTH FOR EMPLOYEES", "CONSTRUCTION", "COURIER SERVICE", "FEDERAL AGENCY",
  "FOREIGN COUNTRY SECURITY", "FUNERAL HOME", "GASOLINE STATION", "GUN DEALER", "HOTEL/MOTEL BUSINESS",
  "JEWELER", "LAW FIRM", "MANUFACTURER", "MEDICAL PROFESSION", "NYC AGENCY", "NYS AGENCY", "OTHER",
  "PAWNBROKER BUSINESS", "PEACE OFFICER", "PHARMACY", "PLUMBING BUSINESS", "PRIVATE INVESTIGATOR",
  "REAL ESTATE BUSINESS", "RELIGIOUS INSTITUTE", "RESTAURANT BUSINESS", "RET COURT CLERK/COURT OFFICER",
  "RETAIL FOOD SERVICE", "RETAIL HARDWARE", "TAXI-LIVERY SERVICE", "VENDING MACHINE",
  "WATCH GUARD & PATROL AGENCY", "WHOLESALE FOOD SERVICE",
]
// Height as feet-inches, every inch 3'00" … 8'00" (the portal's own select).
const HEIGHTS = Array.from({ length: (8 - 3) * 12 + 1 }, (_, i) => {
  const total = 36 + i
  return `${Math.floor(total / 12)}'${String(total % 12).padStart(2, "0")}"`
})

export const FACTS: FactDef[] = [
  // ── You ──
  { key: "applicant.legalFirstName", label: "First name", type: "text", group: "you", from: (s) => nameParts(s.client.fullName)[0] },
  { key: "applicant.legalMiddleInitial", label: "Middle initial", type: "text", group: "you", from: (s) => s.intake.middleInitial },
  { key: "applicant.legalLastName", label: "Last name", type: "text", group: "you", from: (s) => { const p = nameParts(s.client.fullName); return p.length > 1 ? p[p.length - 1] : "" } },
  { key: "applicant.aliasOrMaidenName", label: "Alias / maiden name", type: "text", group: "you", optional: true, placeholder: "leave blank if none", from: (s) => s.intake.aliasName },
  { key: "applicant.dob", label: "Date of birth", type: "date", group: "you", sensitive: true, from: (s) => s.intake.dob },
  // Place of birth is a paper-form leftover — the online portal never asks it (what it
  // wants is proof of citizenship, a document, IDN-03). Hidden from the editor and the
  // readiness count; the column stays so nothing already captured is lost.
  { key: "applicant.placeOfBirth", label: "Place of birth", type: "text", group: "you", hidden: true, placeholder: "City, State, Country", from: (s) => s.intake.placeOfBirth },
  { key: "applicant.sex", label: "Gender", type: "select", group: "physical", options: ["Male", "Female", "Other"], from: (s) => s.intake.sex },
  { key: "applicant.height", label: "Height", type: "select", group: "physical", options: HEIGHTS, from: (s) => (s.intake.heightInches ? `${Math.floor(Number(s.intake.heightInches) / 12)}'${String(Number(s.intake.heightInches) % 12).padStart(2, "0")}"` : "") },
  { key: "applicant.weight", label: "Weight (lb)", type: "text", group: "physical", placeholder: "pounds, e.g. 180", from: (s) => (s.intake.weightLbs ? String(s.intake.weightLbs) : "") },
  // Exact NYPD portal value lists (PORTAL_ALIGNMENT_REBUILD Part 2, step 1).
  { key: "applicant.hairColor", label: "Hair color", type: "select", group: "physical", options: ["Black", "Brown", "White", "Red", "Gray", "Blond", "Auburn", "Chestnut", "Bald", "Sandy", "Dyed", "Salt & Pepper", "Frosted", "Other"], from: (s) => s.intake.hairColor },
  { key: "applicant.eyeColor", label: "Eye color", type: "select", group: "physical", options: ["Black", "Blue", "Brown", "Gray", "Green", "Hazel", "Two Different", "Other"], from: (s) => s.intake.eyeColor },
  { key: "applicant.citizenship", label: "Are you a U.S. citizen?", type: "select", group: "you", options: ["U.S. citizen", "Lawful permanent resident (green card)", "Neither"], from: (s) => s.intake.citizenship },
  // Alien registration # — shown ONLY for a lawful permanent resident (a conditional,
  // not an "only if it applies" tag). Required when shown.
  { key: "applicant.alienRegistrationNumber", label: "Alien registration #", type: "text", group: "you", showWhen: { key: "applicant.citizenship", equals: ["Lawful permanent resident (green card)"] }, from: (s) => s.intake.alienRegistrationNumber },
  // Renewal — the prior licence number. Shown ONLY on a renewal case (server gate).
  { key: "applicant.priorLicenseNumber", label: "Prior licence number", type: "text", group: "you", renewalOnly: true, placeholder: "your expiring licence number" },

  // ── Address ──
  { key: "applicant.address.street", label: "Street address", type: "text", group: "address", from: (s) => s.intake.legalStreet },
  { key: "applicant.address.apt", label: "Apt #", type: "text", group: "address", optional: true, placeholder: "if you have one", from: (s) => s.intake.legalApt },
  { key: "applicant.address.city", label: "City", type: "text", group: "address", from: (s) => s.intake.legalCity },
  { key: "applicant.address.state", label: "State", type: "select", group: "address", options: US_STATES, from: (s) => s.intake.legalState ?? "NY" },
  { key: "applicant.address.zip", label: "ZIP", type: "zip", group: "address", from: (s) => s.client.zip },
  // Mailing address — a separate block behind a "different from home?" flag (portal
  // step 1). Optional; left blank when the mailing address is the home address.
  { key: "applicant.mailingDifferent", label: "Mailing address different from home?", type: "select", group: "address", options: ["No", "Yes"], optional: true },
  { key: "applicant.mailing.street", label: "Mailing street", type: "text", group: "address", optional: true },
  { key: "applicant.mailing.apt", label: "Mailing apt/unit", type: "text", group: "address", optional: true },
  { key: "applicant.mailing.city", label: "Mailing city", type: "text", group: "address", optional: true },
  { key: "applicant.mailing.state", label: "Mailing state", type: "select", group: "address", options: US_STATES, optional: true },
  { key: "applicant.mailing.zip", label: "Mailing ZIP", type: "zip", group: "address", optional: true },

  // ── Contact ──
  // The portal has exactly two phones: Primary (cell) and Other (work). Home phone is
  // a paper-form leftover — hidden from the editor; its value falls back into the cell
  // at resolve time (see resolveFacts) so a case that had only a home phone keeps it.
  { key: "applicant.phone.home", label: "Home phone (legacy)", type: "phone", group: "contact", hidden: true },
  { key: "applicant.phone.cell", label: "Cell phone (primary)", type: "phone", group: "contact", from: (s) => s.client.phone },
  { key: "applicant.phone.work", label: "Work phone (other)", type: "phone", group: "contact", optional: true },
  { key: "applicant.email", label: "Email", type: "text", group: "contact", from: (s) => s.client.email },

  // ── Employer (the applicant's own, unless a sponsorship supplies it) ──
  // Employer facts resolve SPONSOR-FIRST when a sponsorship exists (the employer
  // IS the sponsoring company), then fall back to the applicant's intake. Uniform
  // across all employer.* so `employer.name` is no longer the odd one out.
  // "Currently employed?" gates the rest of the block — every downstream employer
  // field is shown only when the answer is Yes.
  { key: "employer.employed", label: "Currently employed?", type: "select", group: "employer", options: ["Yes", "No"] },
  { key: "employer.name", label: "Employer name", type: "text", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.legalName ?? s.intake.businessName },
  { key: "employer.address.street", label: "Employer street", type: "text", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessStreet ?? s.intake.businessStreet },
  // Unit/suite is part of the address — directly under the street (#5).
  { key: "employer.unit", label: "Business unit / suite number", type: "text", group: "employer", optional: true, showWhen: { key: "employer.employed", equals: ["Yes"] }, placeholder: "if any" },
  { key: "employer.address.city", label: "Employer city", type: "text", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessCity ?? s.intake.businessCity },
  { key: "employer.address.state", label: "Employer state", type: "select", group: "employer", options: US_STATES, showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessState ?? s.intake.businessState },
  { key: "employer.address.zip", label: "Employer ZIP", type: "zip", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessZip ?? s.intake.businessZip },
  { key: "employer.phone", label: "Employer phone", type: "phone", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessPhone ?? s.intake.businessPhone },
  { key: "employer.type", label: "Industry / type of business", type: "select", group: "employer", options: INDUSTRIES, showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.sponsor?.businessType ?? s.intake.businessType },
  { key: "applicant.jobTitle", label: "Job title", type: "text", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] }, from: (s) => s.intake.occupation },
  // Start date — required when employed, hidden entirely when not. Every job has one.
  { key: "employer.startDate", label: "Current employment start date", type: "date", group: "employer", showWhen: { key: "employer.employed", equals: ["Yes"] } },

  // ── Safeguard (Q30 how/where + Q31 the designated person) ──
  // Scalars, so they live in the fact layer (entered once, reused on every form and
  // reachable on /portal/details — a concierge applicant never sees the wizard). The
  // NYPD constraints ride in the label: Q30 storage must be IN New York State, and
  // the Q31 person must be a New York State resident.
  { key: "safeguard.method", label: "How the handgun is secured when not in use (must be in New York State)", type: "text", group: "safeguard", from: (s) => s.intake.safeguardMethod, example: "In a locked safe in my bedroom closet at my home address, with the ammunition stored separately in the same safe." },
  // The safeguarding PERSON. The portal has separate first/last name inputs; the old
  // combined `safeguard.name` is kept hidden only as a read fallback.
  { key: "safeguard.name", label: "Safeguard person (combined — legacy)", type: "text", group: "safeguard", hidden: true, from: (s) => s.intake.safeguardName },
  { key: "safeguard.firstName", label: "Person who will safeguard it — first name (must be at least 21)", type: "text", group: "safeguard", from: (s) => (s.intake.safeguardName ?? "").trim().split(/\s+/)[0] },
  { key: "safeguard.lastName", label: "Safeguard person — last name", type: "text", group: "safeguard", from: (s) => { const p = (s.intake.safeguardName ?? "").trim().split(/\s+/).filter(Boolean); return p.length > 1 ? p[p.length - 1] : "" } },
  { key: "safeguard.relation", label: "Their relationship to you (spouse, sibling, family, friend, other)", type: "text", group: "safeguard", from: (s) => s.intake.safeguardRelation },
  { key: "safeguard.email", label: "Their email address (required by the portal)", type: "text", group: "safeguard" },
  { key: "safeguard.phone", label: "Their telephone", type: "phone", group: "safeguard", from: (s) => s.intake.safeguardPhone },
  // Their address — structured (the portal wants building/street/apt/city/state/zip,
  // not a blob). `safeguard.address` is kept hidden as the legacy single-line fallback.
  { key: "safeguard.address", label: "Their address (combined — legacy)", type: "text", group: "safeguard", hidden: true, from: (s) => s.intake.safeguardAddress },
  { key: "safeguard.street", label: "Their street address", type: "text", group: "safeguard", optional: true },
  { key: "safeguard.apt", label: "Their apt / unit", type: "text", group: "safeguard", optional: true },
  { key: "safeguard.city", label: "Their city", type: "text", group: "safeguard", optional: true },
  { key: "safeguard.state", label: "Their state", type: "select", group: "safeguard", options: US_STATES, optional: true },
  { key: "safeguard.zip", label: "Their ZIP", type: "zip", group: "safeguard", optional: true },

  // The SAFEKEEPING LOCATION — where the handgun is physically secured. A distinct
  // full address (not the home address; for a business licence it often differs).
  { key: "safekeeping.street", label: "Where it is secured — street address", type: "text", group: "safekeeping" },
  { key: "safekeeping.apt", label: "Apt / unit / suite", type: "text", group: "safekeeping", optional: true },
  { key: "safekeeping.city", label: "City", type: "text", group: "safekeeping" },
  { key: "safekeeping.state", label: "State", type: "select", group: "safekeeping", options: US_STATES, from: () => "NY" },
  { key: "safekeeping.zip", label: "ZIP", type: "zip", group: "safekeeping" },
  // 21+ is the portal's HARD rule for the safeguarding person (NY residency is only
  // "ideally"). We capture it explicitly so readiness can block an under-21.
  { key: "safeguard.is21", label: "Is this person at least 21 years old?", type: "select", group: "safeguard", options: ["Yes", "No"] },

  // Counsel — the portal asks everyone; most answer "No", the name block only applies
  // on "Yes". This is NOT legal representation of the applicant by us.
  // Dynamic: No → nothing else renders; Yes → five required attorney fields. A hidden
  // conditional needs no "only if it applies" tag.
  { key: "counsel.represented", label: "Are you represented by an attorney for this application?", type: "select", group: "counsel", options: ["No", "Yes"] },
  { key: "counsel.firstName", label: "Attorney first name", type: "text", group: "counsel", showWhen: { key: "counsel.represented", equals: ["Yes"] } },
  { key: "counsel.lastName", label: "Attorney last name", type: "text", group: "counsel", showWhen: { key: "counsel.represented", equals: ["Yes"] } },
  { key: "counsel.firm", label: "Name of firm", type: "text", group: "counsel", showWhen: { key: "counsel.represented", equals: ["Yes"] } },
  { key: "counsel.email", label: "Attorney email", type: "text", group: "counsel", showWhen: { key: "counsel.represented", equals: ["Yes"] } },
  { key: "counsel.phone", label: "Attorney phone", type: "phone", group: "counsel", showWhen: { key: "counsel.represented", equals: ["Yes"] } },

  // Building Number / Street Name split (portal wants them separate). These live in a
  // HIDDEN group — never rendered by the generic details editor; driven by the bespoke
  // AddressSplits widget (parse + confirm). `streetConfirmed` = "yes" once the applicant
  // confirms the guess. No `from` seeding — a parse is a guess until confirmed.
  { key: "applicant.address.buildingNumber", label: "Home building number", type: "text", group: "addressSplit", optional: true },
  { key: "applicant.address.streetName", label: "Home street name", type: "text", group: "addressSplit", optional: true },
  { key: "applicant.address.streetConfirmed", label: "Home street split confirmed", type: "text", group: "addressSplit", optional: true },
  { key: "applicant.mailing.buildingNumber", label: "Mailing building number", type: "text", group: "addressSplit", optional: true },
  { key: "applicant.mailing.streetName", label: "Mailing street name", type: "text", group: "addressSplit", optional: true },
  { key: "applicant.mailing.streetConfirmed", label: "Mailing street split confirmed", type: "text", group: "addressSplit", optional: true },
  { key: "employer.address.buildingNumber", label: "Employer building number", type: "text", group: "addressSplit", optional: true },
  { key: "employer.address.streetName", label: "Employer street name", type: "text", group: "addressSplit", optional: true },
  { key: "employer.address.streetConfirmed", label: "Employer street split confirmed", type: "text", group: "addressSplit", optional: true },
  { key: "safeguard.buildingNumber", label: "Safeguard building number", type: "text", group: "addressSplit", optional: true },
  { key: "safeguard.streetName", label: "Safeguard street name", type: "text", group: "addressSplit", optional: true },
  { key: "safeguard.streetConfirmed", label: "Safeguard street split confirmed", type: "text", group: "addressSplit", optional: true },
  { key: "safekeeping.buildingNumber", label: "Safekeeping building number", type: "text", group: "addressSplit", optional: true },
  { key: "safekeeping.streetName", label: "Safekeeping street name", type: "text", group: "addressSplit", optional: true },
  { key: "safekeeping.streetConfirmed", label: "Safekeeping street split confirmed", type: "text", group: "addressSplit", optional: true },

  // ── Sponsor-owned ──
  { key: "sponsor.legalName", label: "Company legal name", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.legalName },
  { key: "sponsor.agencyLicenseNumber", label: "Agency licence #", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.agencyLicenseNumber },
  { key: "sponsor.agencyLicenseExpiry", label: "Agency licence expiry", type: "date", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.agencyLicenseExpiry },
  { key: "sponsor.custodianName", label: "Gun custodian", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.custodianName },
  { key: "sponsor.custodianLicenseNumber", label: "Custodian licence #", type: "text", group: "sponsor", owner: "sponsor", from: (s) => s.sponsor?.custodianLicenseNumber },

  // ── SSN — registered, but NEVER stored in case_facts (see lib/facts/ssn) ──
  // The portal wants only the LAST FOUR digits (step 1). We never ask for or store a
  // full SSN — less sensitive data, same outcome. Held in the encrypted store.
  { key: "applicant.ssn", label: "Social Security number — last 4 digits only", type: "text", group: "you", sensitive: true },

  // ── Derived (read-only) ──
  { key: "applicant.fullName", label: "Full name", type: "text", group: "you", derive: (g) => [g("applicant.legalFirstName"), g("applicant.legalMiddleInitial"), g("applicant.legalLastName")].filter(Boolean).join(" ") },
  { key: "applicant.fullAddress", label: "Full address", type: "text", group: "address", derive: (g) => {
    const line1 = [g("applicant.address.street"), g("applicant.address.apt")].filter(Boolean).join(" Apt ")
    return [line1, g("applicant.address.city"), [g("applicant.address.state"), g("applicant.address.zip")].filter(Boolean).join(" ")].filter(Boolean).join(", ")
  } },
  { key: "applicant.age", label: "Age", type: "text", group: "you", derive: (g) => {
    const dob = g("applicant.dob")
    if (!dob) return ""
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return ""
    const now = new Date(2026, 7, 24) // stamped; scripts can't call new Date() but app resolve overrides
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return String(age)
  } },
  { key: "applicant.dob.mm", label: "DOB month", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[1] ?? "") },
  { key: "applicant.dob.dd", label: "DOB day", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[2] ?? "") },
  { key: "applicant.dob.yyyy", label: "DOB year", type: "text", group: "you", derive: (g) => (g("applicant.dob").split("-")[0] ?? "") },
]

export const FACT_BY_KEY: Record<string, FactDef> = Object.fromEntries(FACTS.map((f) => [f.key, f]))

export function factDef(key: string): FactDef | null {
  return FACT_BY_KEY[key] ?? null
}

/** The non-derived, non-SSN facts a person actually enters — for backfill + the details screen. */
export const EDITABLE_FACTS = FACTS.filter((f) => !f.derive && f.key !== "applicant.ssn")
