/**
 * The safeguard person cannot be the applicant. This proves the detector is forgiving
 * about format (case, spacing, middle initials, phone punctuation) but strict about
 * identity (a shared surname is not a match; plus-addressed emails are different mailboxes;
 * the address is never compared).
 */
import { describe, expect, it } from "vitest"
import {
  detectSelfDesignation,
  safeguardFactWriteConflict,
  safeguardInviteConflict,
  SELF_DESIGNATION_MESSAGES,
} from "@/lib/safeguard/self-designation"

const A = { firstName: "Marcus", lastName: "Powell", email: "marcus@example.com", phone: "(212) 555-0148" }

describe("detectSelfDesignation", () => {
  it("flags name on an exact match with different case and spacing", () => {
    expect(
      detectSelfDesignation({ applicant: A, safeguard: { firstName: "  marcus ", lastName: "POWELL" } })
    ).toEqual(["name"])
  })

  it("ignores a middle initial — 'Marcus J. Powell' vs 'marcus powell' flags name", () => {
    expect(
      detectSelfDesignation({
        applicant: { firstName: "Marcus J.", lastName: "Powell" },
        safeguard: { firstName: "marcus", lastName: "powell" },
      })
    ).toEqual(["name"])
  })

  it("does NOT flag a shared surname with a different first name (a sibling is valid)", () => {
    expect(
      detectSelfDesignation({
        applicant: { firstName: "Marcus", lastName: "Powell" },
        safeguard: { firstName: "Jordan", lastName: "Powell" },
      })
    ).toEqual([])
  })

  it("flags email on an identical address with different case", () => {
    expect(
      detectSelfDesignation({
        applicant: { email: "Marcus@Example.com" },
        safeguard: { email: "marcus@example.com" },
      })
    ).toEqual(["email"])
  })

  it("does NOT fold plus-addressing — a+one@x vs a+two@x is not a match", () => {
    expect(
      detectSelfDesignation({
        applicant: { email: "a+one@x.com" },
        safeguard: { email: "a+two@x.com" },
      })
    ).toEqual([])
  })

  it("flags phone across formatting differences (+1, dashes, parens)", () => {
    expect(
      detectSelfDesignation({
        applicant: { phone: "(212) 555-0148" },
        safeguard: { phone: "+1 212-555-0148" },
      })
    ).toEqual(["phone"])
  })

  it("does NOT flag a shared address (everything else different)", () => {
    // The module has no address input at all — a spouse at the same home is valid.
    expect(
      detectSelfDesignation({
        applicant: { firstName: "Marcus", lastName: "Powell", email: "marcus@x.com", phone: "2125550148" },
        safeguard: { firstName: "Dana", lastName: "Ruiz", email: "dana@x.com", phone: "2125550170" },
      })
    ).toEqual([])
  })

  it("returns all three fields when name, email and phone all match", () => {
    expect(detectSelfDesignation({ applicant: A, safeguard: A })).toEqual(["name", "email", "phone"])
  })

  it("flags identically on a sponsored case, where identity comes from resolved facts", () => {
    // The applicant identity is resolved from the fact layer (applicant.legalFirstName/…),
    // not intake — the same shape reaches the detector, so the result is identical.
    const applicant = { firstName: "Chery", lastName: "Gimps", email: "chery@guard.co", phone: "9295550123" }
    expect(detectSelfDesignation({ applicant, safeguard: { ...applicant } })).toEqual(["name", "email", "phone"])
  })

  it("does not flag an empty safeguard block", () => {
    expect(detectSelfDesignation({ applicant: A, safeguard: {} })).toEqual([])
  })
})

// The server is the authority (the client check is a convenience). These guard helpers are
// exactly what setCaseFact and sendSafeguardInvite call.
describe("safeguardFactWriteConflict — the setCaseFact guard", () => {
  const facts = {
    "applicant.legalFirstName": "Marcus",
    "applicant.legalLastName": "Powell",
    "applicant.email": "marcus@example.com",
    "applicant.phone.cell": "2125550148",
    "safeguard.firstName": "Dana",
    "safeguard.lastName": "Ruiz",
  }

  it("rejects a safeguard.email write that is the applicant's own address", () => {
    expect(safeguardFactWriteConflict("safeguard.email", "Marcus@Example.com", facts)).toBe(
      SELF_DESIGNATION_MESSAGES.email
    )
  })

  it("rejects a safeguard.lastName write that completes the applicant's own name", () => {
    // Overlaying lastName "Powell" onto an existing firstName "Marcus" makes the block the
    // applicant — the single-field write is judged against the rest of the block.
    const withFirst = { ...facts, "safeguard.firstName": "Marcus" }
    expect(safeguardFactWriteConflict("safeguard.lastName", "Powell", withFirst)).toBe(
      SELF_DESIGNATION_MESSAGES.name
    )
  })

  it("allows a safeguard.email write that is somebody else's", () => {
    expect(safeguardFactWriteConflict("safeguard.email", "dana@example.com", facts)).toBeNull()
  })

  it("allows any non-identity safeguard field (never blocks address/relationship)", () => {
    expect(safeguardFactWriteConflict("safeguard.city", "Brooklyn", facts)).toBeNull()
  })
})

describe("safeguardInviteConflict — the sendSafeguardInvite guard", () => {
  it("refuses to send when the safeguard email is the applicant's, with the email message", () => {
    const facts = {
      "applicant.email": "marcus@example.com",
      "safeguard.email": "marcus@example.com",
    }
    expect(safeguardInviteConflict(facts)).toBe(SELF_DESIGNATION_MESSAGES.email)
  })

  it("allows sending to a genuinely different person", () => {
    const facts = {
      "applicant.legalFirstName": "Marcus",
      "applicant.legalLastName": "Powell",
      "applicant.email": "marcus@example.com",
      "safeguard.firstName": "Dana",
      "safeguard.lastName": "Ruiz",
      "safeguard.email": "dana@example.com",
    }
    expect(safeguardInviteConflict(facts)).toBeNull()
  })
})
