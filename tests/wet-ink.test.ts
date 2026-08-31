import { describe, expect, it } from "vitest"
import { REQUIREMENT_ACTIONS, actionFor, isSignable, actionWetInk } from "@/lib/requirements/actions"
import { FORM_TEMPLATES, templateWetInk } from "@/lib/forms/templates"

// Part B4 — the UI must never offer to digitally sign a form the fill layer refuses.
// The two layers agreeing is exactly what the runtime bug proved was missing.

describe("B4 — signable and wet-ink never both apply to a requirement", () => {
  it("no requirement is both digitally signable and wet-ink", () => {
    for (const [code, action] of Object.entries(REQUIREMENT_ACTIONS)) {
      const both = isSignable(action) && !!actionWetInk(action)
      expect(both, `${code} is BOTH signable and wet-ink`).toBe(false)
    }
  })

  it("a wet-ink requirement is never reported as signable (so the pad never renders)", () => {
    for (const [code, action] of Object.entries(REQUIREMENT_ACTIONS)) {
      if (actionWetInk(action)) expect(isSignable(action), `${code} offers a pad`).toBe(false)
    }
  })
})

describe("B2 — the wet-ink forms carry the right mode", () => {
  it("safeguard is witnessed, not notarised", () => {
    expect(actionWetInk(actionFor("SFG-01"))).toBe("witness")
  })
  it("the affidavit of familiarity and pre-licence exemption are notarised", () => {
    expect(actionWetInk(actionFor("FAM-01"))).toBe("notary")
    expect(actionWetInk(actionFor("PLE-01"))).toBe("notary")
  })
})

describe("template-level: signable and wet-ink are mutually exclusive", () => {
  it("no template declares both", () => {
    for (const [key, t] of Object.entries(FORM_TEMPLATES)) {
      const both = !!t.signable && !!templateWetInk(t)
      expect(both, `${key} declares both signable and wet-ink`).toBe(false)
    }
  })
})
