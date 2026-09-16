/**
 * The identities a sponsor-test seed run touches, derived from QA_SUFFIX. Pure and
 * side-effect-free so the seed script and its test share ONE definition — a run only
 * ever creates/deletes rows for its own suffix, and a suffixed run can never collide
 * with (or delete) the unsuffixed set. A malformed suffix is refused, never silently
 * dropped (the silent fallback once created a stray unsuffixed case in production).
 */
export interface QaSeedIdentities {
  applicantEmail: string
  sponsorEmail: string
  safeguardEmail: string
  companyName: string
}

/** Validate + normalise QA_SUFFIX. "" = the base (unsuffixed) set. Throws on malformed. */
export function qaSuffix(raw: string | undefined | null): string {
  const s = raw ?? ""
  if (s && !/^-[a-z0-9]+$/i.test(s)) {
    throw new Error(`QA_SUFFIX must match /^-[a-z0-9]+$/ (e.g. "-qa2"); got ${JSON.stringify(s)}`)
  }
  return s
}

export function qaSeedIdentities(suffix: string): QaSeedIdentities {
  return {
    applicantEmail: `se2018+applicant${suffix}@gmail.com`,
    sponsorEmail: `se2018+sponsor${suffix}@gmail.com`,
    safeguardEmail: `se2018+safeguard${suffix}@gmail.com`,
    companyName: `Test Guard Co.${suffix}`,
  }
}
