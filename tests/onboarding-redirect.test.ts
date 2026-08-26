/**
 * The onboarding routing: the path FORK is the first thing a new applicant sees;
 * Self-Guided → intake; Full Concierge → never intake (we fill it out for them).
 */
import { describe, expect, it } from "vitest"
import { decideOnboardingRedirect } from "@/lib/portal/intake-gate"
import type { CaseStageKey } from "@/config/stages"

const base = {
  pathname: "/portal",
  serviceMode: null as string | null,
  stage: "lead" as CaseStageKey,
  intakeCompleted: false,
  hasAttorneyReview: false,
}

describe("decideOnboardingRedirect", () => {
  it("a brand-new, unforked applicant is sent to the fork first", () => {
    expect(decideOnboardingRedirect(base)).toBe("/portal/choose-path")
  })

  it("Self-Guided (unforked done) → intake", () => {
    expect(decideOnboardingRedirect({ ...base, serviceMode: "self_guided" })).toBe("/portal/intake")
  })

  it("Full Concierge → NEVER intake (straight to their dashboard)", () => {
    expect(decideOnboardingRedirect({ ...base, serviceMode: "concierge" })).toBeNull()
    // even on a deep portal path
    expect(
      decideOnboardingRedirect({ ...base, serviceMode: "concierge", pathname: "/portal/checklist" })
    ).toBeNull()
  })

  it("the fork + intake + account pages are always reachable", () => {
    for (const p of ["/portal/choose-path", "/portal/intake", "/portal/profile", "/portal/privacy"]) {
      expect(decideOnboardingRedirect({ ...base, pathname: p })).toBeNull()
    }
  })

  it("stops firing once intake is done or the case has moved past 'lead'", () => {
    expect(decideOnboardingRedirect({ ...base, serviceMode: "self_guided", intakeCompleted: true })).toBeNull()
    expect(decideOnboardingRedirect({ ...base, stage: "document_collection" as CaseStageKey })).toBeNull()
  })

  it("an attorney-review case is never trapped", () => {
    expect(
      decideOnboardingRedirect({ ...base, serviceMode: "self_guided", hasAttorneyReview: true })
    ).toBeNull()
  })

  it("a SPONSORED case requires the applicant's own intake even under concierge", () => {
    // Concierge would normally skip intake, but a sponsor can't supply the
    // applicant's identity/disclosures — so intake is forced until complete.
    expect(
      decideOnboardingRedirect({ ...base, serviceMode: "concierge", isSponsored: true, stage: "document_collection" as CaseStageKey })
    ).toBe("/portal/intake")
  })

  it("a SPONSORED case with intake complete is let through", () => {
    expect(
      decideOnboardingRedirect({
        ...base,
        serviceMode: "concierge",
        isSponsored: true,
        intakeCompleted: true,
        stage: "document_collection" as CaseStageKey,
      })
    ).toBeNull()
  })

  it("a sponsored case still isn't trapped away from the account pages or under attorney review", () => {
    expect(
      decideOnboardingRedirect({ ...base, isSponsored: true, pathname: "/portal/intake" })
    ).toBeNull()
    expect(
      decideOnboardingRedirect({ ...base, isSponsored: true, hasAttorneyReview: true })
    ).toBeNull()
  })
})
