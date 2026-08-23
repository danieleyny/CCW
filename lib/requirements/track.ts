/**
 * resolveArmedTrack — DERIVE the sponsored armed-guard (Carry Guard) licence
 * category from intake, the same way ELG-02 is system-verified from the address
 * rather than asserted by a human. Pure function, no DB, no IO.
 *
 * Called ONLY for a sponsored case (one with a case_sponsorships row). A case
 * with no sponsorship is always 'concealed_carry' and never reaches this.
 *
 * The branch logic comes from NY Penal Law §400.00(3): an application is filed
 * with the licensing officer where the applicant "resides, is principally
 * employed or has his or her principal place of business." Employment in NYC is
 * the jurisdictional hook that makes Branches B and C possible.
 *
 *   A — lives in the five boroughs            → carry_guard (clean path)
 *   B — lives in NY State, outside NYC        → special_carry_guard, built on top
 *       + holds a home-county pistol licence    of that county licence (SCG-01)
 *       - no county licence / unsure          → sponsored_unresolved (must apply to
 *                                                the county first — a different
 *                                                authority; we do NOT file it)
 *   C — lives outside New York State          → sponsored_unresolved, confirm the
 *                                                category with the License Division
 *
 * 'sponsored_unresolved' is a first-class state: the sponsor packet still
 * proceeds, only the applicant's NYPD-specific set waits. isArmedGuard is true
 * ONLY once resolved to a real armed track — an unresolved case must not seed a
 * checklist we are not sure about.
 */
import type { WizardAnswers } from "@/lib/intake/answers"

export type LicenseTrack =
  | "concealed_carry"
  | "carry_guard"
  | "special_carry_guard"
  | "sponsored_unresolved"

export interface ArmedTrackResult {
  track: LicenseTrack
  /** Human-readable reasons the case cannot yet proceed to filing. */
  blockers: string[]
  /** Branch C — a non-resident whose category the License Division must confirm. */
  mustConfirmWithLicenseDivision: boolean
  /** "Not sure" on the county licence — raise a staff task rather than the hard blocker. */
  needsCountyLicenseTask: boolean
  // ── Generator flags (fed into toGeneratorAnswers) ──
  /** True ONLY when resolved to a real armed track (carry_guard | special_carry_guard). */
  isArmedGuard: boolean
  needsPreLicenseExemption: boolean // PLE-01: armed AND holds no other pistol licence
  needsCountyLicenseDoc: boolean // SCG-01: Branch B AND holds a county licence
}

const COUNTY_PREREQ_BLOCKER =
  "A Special Carry Guard licence is built on top of an active pistol licence from your home county. You must first apply to your own county's licensing officer — a different authority, with its own process and timeline, that we do not file with the NYPD."

const CONFIRM_CATEGORY_BLOCKER =
  "As a non-resident armed guard, your licence category must be confirmed with the NYPD License Division before any filing fee is paid. We're confirming it now."

export function resolveArmedTrack(a: WizardAnswers): ArmedTrackResult {
  const base = {
    blockers: [] as string[],
    mustConfirmWithLicenseDivision: false,
    needsCountyLicenseTask: false,
    isArmedGuard: false,
    needsPreLicenseExemption: false,
    needsCountyLicenseDoc: false,
  }

  // PLE-01 applies whenever the applicant holds no other pistol licence anywhere.
  const noOtherLicence = !a.otherPistolLicense

  // BRANCH A — five boroughs.
  if (a.residence === "nyc") {
    return {
      ...base,
      track: "carry_guard",
      isArmedGuard: true,
      needsPreLicenseExemption: noOtherLicence,
    }
  }

  // Non-resident of NYC. NY-outside-NYC (Branch B) vs out-of-state (Branch C) is
  // decided by the legal-address state.
  const inNewYorkState = (a.legalState ?? "NY").trim().toUpperCase() === "NY"

  if (inNewYorkState) {
    // BRANCH B — NY State, outside the five boroughs.
    if (a.homeCountyPistolLicense === "yes") {
      return {
        ...base,
        track: "special_carry_guard",
        isArmedGuard: true,
        needsPreLicenseExemption: noOtherLicence,
        needsCountyLicenseDoc: true, // SCG-01
      }
    }
    // "no" or "unsure" — cannot build Special Carry Guard yet.
    return {
      ...base,
      track: "sponsored_unresolved",
      blockers: [COUNTY_PREREQ_BLOCKER],
      needsCountyLicenseTask: a.homeCountyPistolLicense === "unsure",
    }
  }

  // BRANCH C — outside New York State. The NYC-assignment employment hook plausibly
  // gives the NYPD jurisdiction, but the correct category is a License Division call.
  return {
    ...base,
    track: "sponsored_unresolved",
    mustConfirmWithLicenseDivision: true,
    blockers: [CONFIRM_CATEGORY_BLOCKER],
  }
}
