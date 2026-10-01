/**
 * The safeguard person cannot be the applicant. NYPD's step-7 instruction is explicit
 * — "Identify an individual (not yourself)" — because the whole point of this person is
 * to take custody of the firearm when the applicant cannot. Naming yourself leaves nobody
 * able to act, and the License Division rejects it.
 *
 * This module DETECTS the conflict from the collected details. It is pure and
 * dependency-free so the same check runs on the client (live, as they type) and on the
 * server (the authority — a sworn application can't rely on a client-side check).
 *
 * Be forgiving about format, strict about identity: a shared surname is NOT a match (a
 * brother is a valid safeguard), and we never compare the ADDRESS (a spouse/parent/sibling
 * at the same home is the most common valid choice — the intake wizard's "use my home
 * address" helper exists for exactly that).
 */

/**
 * Why the safeguard person can't be the applicant — the reason, not just the rule. The
 * same substance appears on every surface that collects or explains the safeguard person
 * (intake, the details editor, the invite card, and the safeguard person's own page), so
 * it lives here once. `_SHORT` is a one-line version for tight spaces.
 */
export const SAFEGUARD_NOT_YOU_NOTE =
  "This has to be someone other than you. If you die or become unable to manage your firearm — injury, illness, any emergency — this is the person the NYPD License Division will contact to take custody of it and surrender it. Naming yourself would leave nobody able to act, so the License Division does not accept it. They must be at least 21, a New York State resident, and must know where you store your firearm."

export const SAFEGUARD_NOT_YOU_SHORT =
  "This must be someone other than you — the person the License Division contacts to take custody of your firearm if you can't. They must be at least 21 and a New York State resident."

export type SelfDesignationField = "name" | "email" | "phone"

export interface SelfDesignationParty {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

/** Suffix tokens that never distinguish two people. */
const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"])

/** Lowercase, strip accents and punctuation, collapse whitespace. */
function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation → space (hyphens, periods, apostrophes)
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The significant tokens of a name part — accents/punctuation/case folded away, with
 * middle initials (single characters) and generational suffixes dropped, so "Marcus J.
 * Powell" and "marcus powell" reduce to the same tokens.
 */
function significantTokens(raw: string): string[] {
  return normalizeText(raw)
    .split(" ")
    .filter((t) => t.length > 1 && !SUFFIXES.has(t))
}

/**
 * A name matches only when BOTH the first name and the last name match. We compare the
 * first significant token of the first-name field against the first significant token of
 * theirs, and likewise the last significant token of the last-name field. A shared
 * surname alone never matches.
 */
function nameMatches(a: SelfDesignationParty, b: SelfDesignationParty): boolean {
  const aFirst = significantTokens(a.firstName ?? "")
  const aLast = significantTokens(a.lastName ?? "")
  const bFirst = significantTokens(b.firstName ?? "")
  const bLast = significantTokens(b.lastName ?? "")
  // Require a real first AND last on both sides — a lone token is not enough to conclude
  // "same person" (and an empty safeguard block is not a conflict, just incomplete).
  if (!aFirst.length || !aLast.length || !bFirst.length || !bLast.length) return false
  return aFirst[0] === bFirst[0] && aLast[aLast.length - 1] === bLast[bLast.length - 1]
}

/** Emails are the same mailbox only when byte-identical after trim + lowercase. Plus-
 *  addressing and dots are DELIBERATELY preserved — a+one@x and a+two@x are different
 *  inboxes, and folding them would produce false positives. */
function emailMatches(a?: string | null, b?: string | null): boolean {
  const na = (a ?? "").trim().toLowerCase()
  const nb = (b ?? "").trim().toLowerCase()
  return !!na && na === nb
}

/** Phones match on their last 10 digits, ignoring +1, spaces, dashes and parens.
 *
 * OPEN (owner decision): phone is treated as a HARD conflict, same as name and email.
 * It's the one rule that could false-positive — an older couple sharing a landline is
 * plausible — but the safeguard person exists precisely to be reachable when the
 * applicant is not, so a shared number defeats the purpose. To soften this to a
 * warning instead of a block, change ONLY the phone handling at the enforcement sites;
 * leave name and email as hard blocks. Don't silently reverse this. */
function phoneMatches(a?: string | null, b?: string | null): boolean {
  const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "").slice(-10)
  const na = digits(a)
  const nb = digits(b)
  return na.length === 10 && na === nb
}

/**
 * Which safeguard fields collide with the applicant's own identity. Empty array = no
 * conflict (including a not-yet-filled safeguard block). NEVER compares address.
 */
export function detectSelfDesignation(input: {
  applicant: SelfDesignationParty
  safeguard: SelfDesignationParty
}): SelfDesignationField[] {
  const { applicant, safeguard } = input
  const hits: SelfDesignationField[] = []
  if (nameMatches(applicant, safeguard)) hits.push("name")
  if (emailMatches(applicant.email, safeguard.email)) hits.push("email")
  if (phoneMatches(applicant.phone, safeguard.phone)) hits.push("phone")
  return hits
}

/** Per-field, specific copy — never a generic "invalid" message. */
export const SELF_DESIGNATION_MESSAGES: Record<SelfDesignationField, string> = {
  name: "You can't name yourself as the safeguard person. This has to be someone else who can take custody of your firearm if you can't.",
  email:
    "That's your own email address. The License Division needs to reach this person independently of you, so it has to be their own.",
  phone:
    "That's your own phone number. If something happens to you, this is the number the License Division calls — it has to be theirs, not yours.",
}

/** The single field→message lookup, so every surface shows identical wording. */
export function selfDesignationMessage(field: SelfDesignationField): string {
  return SELF_DESIGNATION_MESSAGES[field]
}

/** The safeguard FACT KEYS each conflict field maps to — so the details editor can ring
 *  the offending rows and readiness can discount them. */
export const SELF_DESIGNATION_FIELD_KEYS: Record<SelfDesignationField, string[]> = {
  name: ["safeguard.firstName", "safeguard.lastName"],
  email: ["safeguard.email"],
  phone: ["safeguard.phone"],
}

/** A map of conflicting fact-key → the message to show on that row. */
export function selfDesignationKeyMessages(fields: SelfDesignationField[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fields) {
    for (const key of SELF_DESIGNATION_FIELD_KEYS[field]) out[key] = SELF_DESIGNATION_MESSAGES[field]
  }
  return out
}

/** A facts map (resolveFacts output) → the two parties the detector compares. Identity
 *  comes from the fact layer, so it's the same on a self-entered and a sponsored case. */
type FactsMap = Record<string, string | undefined>
function partiesFromFacts(facts: FactsMap): { applicant: SelfDesignationParty; safeguard: SelfDesignationParty } {
  return {
    applicant: {
      firstName: facts["applicant.legalFirstName"],
      lastName: facts["applicant.legalLastName"],
      email: facts["applicant.email"],
      phone: facts["applicant.phone.cell"],
    },
    safeguard: {
      firstName: facts["safeguard.firstName"],
      lastName: facts["safeguard.lastName"],
      email: facts["safeguard.email"],
      phone: facts["safeguard.phone"],
    },
  }
}

/**
 * SERVER GUARD for a `safeguard.*` fact write — the reason to reject, or null to allow.
 * `facts` are the case's currently-resolved facts; the pending value is overlaid on the
 * written key before the check, so a single-field edit is judged against the rest of the
 * block. Only the four identity fields can conflict; every other write passes.
 */
export function safeguardFactWriteConflict(key: string, value: string, facts: FactsMap): string | null {
  const map: Record<string, keyof SelfDesignationParty> = {
    "safeguard.firstName": "firstName",
    "safeguard.lastName": "lastName",
    "safeguard.email": "email",
    "safeguard.phone": "phone",
  }
  const field = map[key]
  if (!field || !value.trim()) return null
  const parties = partiesFromFacts(facts)
  const overlaid = { ...parties.safeguard, [field]: value.trim() }
  const messages = selfDesignationKeyMessages(detectSelfDesignation({ applicant: parties.applicant, safeguard: overlaid }))
  return messages[key] ?? null
}

/**
 * SERVER GUARD before sending the safeguard invite — the reason to refuse, or null. The
 * email conflict wins (it's the address we'd be emailing), then any other. This is the
 * last line of defence: never email a "please safeguard this firearm" invite to the
 * applicant themselves.
 */
export function safeguardInviteConflict(facts: FactsMap): string | null {
  const parties = partiesFromFacts(facts)
  const fields = detectSelfDesignation(parties)
  if (!fields.length) return null
  return selfDesignationMessage(fields.includes("email") ? "email" : fields[0])
}
