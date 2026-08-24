/**
 * Pass 3 pure units — no DB.
 *  · §5-09 PLE-01 build() composes the instructor block from structured answers,
 *    and leaves a line blank (for the completeness gate) when the answer is absent.
 *  · The legal name is never inferred from a display name / email (3F).
 *  · The sponsor three-state derivation (received vs accepted), and the armed-track
 *    predicate for the DOS upgrade.
 */
import { describe, expect, it } from "vitest"
import { formTemplate } from "@/lib/forms/templates"
import { factDef } from "@/lib/facts/registry"
import { sponsorItemState } from "@/lib/sponsor/status"
import { isArmedTrack } from "@/lib/dos"
import { decideOnboardingRedirect } from "@/lib/portal/intake-gate"

describe("PLE-01 §5-09 instructor block", () => {
  const t = formTemplate("nypd_prelicense_exemption")!

  it("composes the four verified-statement lines + names from a full statement", () => {
    const out = t.build!({
      fullName: "A B",
      address: "1 St",
      age: "30",
      dob: "1990-01-01",
      instructorName: "Jane Doe",
      instructorCredentials: "DCJS-certified",
      instructorRangeName: "West Range",
      instructorAddress: "5 Range Rd",
      instructorPhone: "555-0100",
      trainingLocation: "West Range, NY",
      metApplicant: true,
      noDanger: true,
    })
    const text = out.text!
    expect(text["Name oflnstructor"]).toBe("Jane Doe")
    expect(text["Name of Range Address Telephone Number"]).toContain("West Range")
    expect(text["lnstmctors Verified Statement 1"]).toContain("Jane Doe")
    expect(text["lnstmctors Verified Statement 1"]).toContain("met the applicant")
    expect(text["lnstmctors Verified Statement 2"]).toContain("no danger")
    expect(text["lnstmctors Verified Statement 3"]).toContain("West Range, NY")
    // Every required instructor field is present ⇒ the completeness gate passes.
    for (const req of t.requires ?? []) expect(text[req] ?? "").not.toBe("")
  })

  it("leaves the danger-assessment line blank when not attested (gate will flag it)", () => {
    const out = t.build!({
      fullName: "A B",
      address: "1 St",
      dob: "1990-01-01",
      instructorName: "Jane Doe",
      metApplicant: true,
      noDanger: false,
    })
    expect(out.text!["lnstmctors Verified Statement 2"]).toBe("")
  })
})

describe("legal name is never inferred from a display name / email (3F)", () => {
  const first = factDef("applicant.legalFirstName")!
  const last = factDef("applicant.legalLastName")!
  const src = (fullName: string) =>
    ({ intake: {}, client: { fullName, email: null, phone: null, borough: null, zip: null }, sponsor: null }) as never

  it("an email as full_name yields no legal name", () => {
    expect(first.from!(src("chery.gimps@example.com"))).toBeFalsy()
    expect(last.from!(src("chery.gimps@example.com"))).toBeFalsy()
  })

  it("a real name still resolves", () => {
    expect(first.from!(src("Chery Gimps"))).toBe("Chery")
    expect(last.from!(src("Chery Gimps"))).toBe("Gimps")
  })
})

describe("sponsor three-state (R3) + armed track", () => {
  it("distinguishes received (uploaded) from accepted (staff)", () => {
    expect(sponsorItemState("pending", false)).toBe("outstanding")
    expect(sponsorItemState("pending", true)).toBe("received") // a doc is in, not yet approved
    expect(sponsorItemState("satisfied", true)).toBe("accepted") // staff accepted
    expect(sponsorItemState("rejected", true)).toBe("changes")
  })

  it("isArmedTrack covers the two armed licences only", () => {
    expect(isArmedTrack("carry_guard")).toBe(true)
    expect(isArmedTrack("special_carry_guard")).toBe(true)
    expect(isArmedTrack("concealed_carry")).toBe(false)
    expect(isArmedTrack(null)).toBe(false)
  })
})

describe("nav bug — /portal/details is reachable during onboarding (3E)", () => {
  const brandNew = { serviceMode: null, stage: "lead" as const, intakeCompleted: false, hasAttorneyReview: false }
  it("does NOT bounce /portal/details to intake for a brand-new applicant", () => {
    expect(decideOnboardingRedirect({ pathname: "/portal/details", ...brandNew })).toBeNull()
  })
  it("still bounces a non-exempt page (regression guard)", () => {
    expect(decideOnboardingRedirect({ pathname: "/portal/checklist", ...brandNew })).toBe("/portal/choose-path")
  })
})
