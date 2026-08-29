import { describe, it, expect } from "vitest"
import {
  SMART_DOCUMENTS,
  smartDocument,
  smartDocumentsForRequirement,
  reqCodesForDocumentKind,
} from "@/lib/requirements/smart-documents"

describe("smart documents — the kind→requirements map is honest", () => {
  it("a U.S. passport covers photo ID, DOB, and citizenship", () => {
    expect(smartDocument("us_passport")!.reqCodes.sort()).toEqual(["IDN-01", "IDN-02", "IDN-03"])
  })

  it("a green card covers all three identity requirements", () => {
    expect(smartDocument("permanent_resident_card")!.reqCodes.sort()).toEqual(["IDN-01", "IDN-02", "IDN-03"])
  })

  it("a driver's license covers photo ID + DOB but NOT citizenship (no over-claim)", () => {
    const codes = smartDocument("drivers_license_or_state_id")!.reqCodes
    expect(codes).toContain("IDN-01")
    expect(codes).toContain("IDN-02")
    expect(codes).not.toContain("IDN-03")
  })

  it("a birth certificate covers DOB + citizenship but is NOT a photo ID", () => {
    const codes = smartDocument("us_birth_certificate")!.reqCodes
    expect(codes).toContain("IDN-02")
    expect(codes).toContain("IDN-03")
    expect(codes).not.toContain("IDN-01")
  })

  it("a naturalization certificate covers citizenship + DOB but not photo ID", () => {
    const codes = smartDocument("naturalization_certificate")!.reqCodes
    expect(codes).toContain("IDN-03")
    expect(codes).toContain("IDN-02")
    expect(codes).not.toContain("IDN-01")
  })

  it("a utility bill covers only proof of residence", () => {
    expect(smartDocument("proof_of_residence")!.reqCodes).toEqual(["RES-01"])
  })

  it("stores each ID document as type 'id' and residence proof as 'proof_residence'", () => {
    for (const d of SMART_DOCUMENTS) {
      if (d.reqCodes.includes("RES-01")) expect(d.documentType).toBe("proof_residence")
      else expect(d.documentType).toBe("id")
    }
  })
})

describe("reqCodesForDocumentKind — only outstanding codes on THIS case", () => {
  it("intersects the map with the case's requirement codes", () => {
    // Passport on a case that only has IDN-01 + IDN-04 → just IDN-01.
    expect(reqCodesForDocumentKind("us_passport", ["IDN-01", "IDN-04"])).toEqual(["IDN-01"])
  })

  it("returns every covered code when all are present", () => {
    expect(reqCodesForDocumentKind("us_passport", ["IDN-01", "IDN-02", "IDN-03", "RES-01"]).sort()).toEqual([
      "IDN-01",
      "IDN-02",
      "IDN-03",
    ])
  })

  it("never invents a code and is safe for an unknown kind", () => {
    expect(reqCodesForDocumentKind("us_passport", ["RES-01"])).toEqual([])
    expect(reqCodesForDocumentKind("not_a_kind", ["IDN-01"])).toEqual([])
  })
})

describe("smartDocumentsForRequirement — pickers offer the right kinds, widest first", () => {
  it("IDN-01 (photo ID) offers passport/green card/license, not birth certificate", () => {
    const kinds = smartDocumentsForRequirement("IDN-01").map((d) => d.kind)
    expect(kinds).toContain("us_passport")
    expect(kinds).toContain("drivers_license_or_state_id")
    expect(kinds).not.toContain("us_birth_certificate")
    // Widest-coverage first (passport/green card have 3 codes).
    expect(smartDocumentsForRequirement("IDN-01")[0].reqCodes.length).toBe(3)
  })

  it("IDN-03 (citizenship) offers passport/green card/birth cert/naturalization, not a license", () => {
    const kinds = smartDocumentsForRequirement("IDN-03").map((d) => d.kind)
    expect(kinds).not.toContain("drivers_license_or_state_id")
    expect(kinds).toContain("us_birth_certificate")
    expect(kinds).toContain("naturalization_certificate")
  })

  it("RES-01 offers the portal's five proof-of-residence kinds (no bank statement)", () => {
    expect(smartDocumentsForRequirement("RES-01").map((d) => d.kind)).toEqual([
      "proof_of_residence",
      "residence_tax_bill",
      "residence_coop_condo",
      "residence_lease",
      "residence_maintenance_bill",
    ])
  })
})
