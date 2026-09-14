/**
 * P1-4 — on a sponsored (armed-guard) case the employer IS the sponsoring company.
 * The whole employer block is gated on `employer.employed === "Yes"`, but that fact
 * had no resolver, so it never derived "Yes" from the sponsor and the block — company
 * name, business address, phone — silently collapsed. It now derives "Yes" whenever a
 * sponsor legal name is present.
 */
import { describe, expect, it } from "vitest"
import { FACTS, type FactSource } from "@/lib/facts/registry"

const def = (key: string) => {
  const f = FACTS.find((d) => d.key === key)
  if (!f) throw new Error(`no fact ${key}`)
  return f
}

function source(sponsor: Partial<NonNullable<FactSource["sponsor"]>> | null): FactSource {
  return {
    intake: {} as FactSource["intake"],
    client: { fullName: "Test", email: null, phone: null, borough: null, zip: null },
    sponsor: sponsor
      ? ({
          legalName: null,
          agencyLicenseNumber: null,
          agencyLicenseExpiry: null,
          custodianName: null,
          custodianLicenseNumber: null,
          businessStreet: null,
          businessCity: null,
          businessState: null,
          businessZip: null,
          businessPhone: null,
          businessType: null,
          ...sponsor,
        } as NonNullable<FactSource["sponsor"]>)
      : null,
  }
}

describe("employer.employed derives from the sponsor", () => {
  it("is 'Yes' when the case has a sponsoring company", () => {
    expect(def("employer.employed").from!(source({ legalName: "Acme Security LLC" }))).toBe("Yes")
  })

  it("is undefined (block hidden) for an unsponsored case with no employment answer", () => {
    expect(def("employer.employed").from!(source(null))).toBeUndefined()
  })

  it("the employer name resolves to the sponsor's legal name so the block is populated", () => {
    expect(def("employer.name").from!(source({ legalName: "Acme Security LLC" }))).toBe("Acme Security LLC")
  })
})
