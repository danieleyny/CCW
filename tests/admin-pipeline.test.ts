import { describe, expect, it } from "vitest"
import { deriveCaseOwnership } from "@/lib/admin/today"
import { paidCaseIds } from "@/lib/packages"

describe("admin pipeline ownership", () => {
  it("keeps NYPD-controlled stages on the agency clock", () => {
    expect(deriveCaseOwnership(
      { stage: "under_investigation" },
      { staffNextStep: "Reply to client", nextAppointment: "Interview Dec 3, 1:30 PM" }
    )).toEqual({ whoseMove: "NYPD", nextStep: "Interview Dec 3, 1:30 PM" })
  })

  it("keeps licensed ahead of staff and third-party signals", () => {
    expect(deriveCaseOwnership(
      { stage: "licensed", licenseIssuedOn: "2026-11-01", licenseExpiresOn: "2029-11-01" },
      { staffNextStep: "Review file", thirdPartyNextStep: "Reference pending" }
    )).toEqual({ whoseMove: "Licensed", nextStep: "Licensed Nov 1, 2026 · renew 2029" })
  })

  it("uses staff, third party, then applicant precedence", () => {
    expect(deriveCaseOwnership(
      { stage: "document_collection" },
      { staffNextStep: "Review 2 uploaded documents", thirdPartyNextStep: "2 of 4 references notarized" }
    ).whoseMove).toBe("Staff")
    expect(deriveCaseOwnership(
      { stage: "document_collection" },
      { thirdPartyNextStep: "2 of 4 references notarized", applicantNextStep: "3 uploads missing" }
    ).whoseMove).toBe("Third party")
    expect(deriveCaseOwnership(
      { stage: "document_collection" },
      { applicantNextStep: "3 uploads missing" }
    )).toEqual({ whoseMove: "Applicant", nextStep: "3 uploads missing" })
  })
})

describe("paidCaseIds", () => {
  it("classifies any paid case without a package filter", async () => {
    const inCall = async () => ({ data: [{ case_id: "case-a" }, { case_id: "case-b" }, { case_id: null }], error: null })
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({ in: inCall }),
        }),
      }),
    }
    const ids = await paidCaseIds(db as never, ["case-a", "case-b", "case-c"])
    expect([...ids]).toEqual(["case-a", "case-b"])
  })
})
