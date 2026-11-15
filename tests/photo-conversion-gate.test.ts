/**
 * A document still awaiting MANUAL conversion (a PDF photo) must not let a case report
 * ready — the SPC-01 failure shape. The gate lives in computePortalReadiness; the DB
 * task raise/close + pending detection live in tests/rls/photo-conversion.test.ts.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { computePortalReadiness } from "@/lib/disclosures/readiness"
import type { ApplicationValues } from "@/lib/forms/application"

// A fully ready-to-ENTER applicant (every need() satisfied) — premises so the Letter of
// Necessity check is skipped, keeping the fixture small.
function readyValues(): ApplicationValues {
  return {
    firstName: "Robert", lastName: "Calder", dob: "1980-01-01",
    street: "1 Main St", city: "Hempstead", state: "NY", zip: "11550",
    sex: "Male", height: "5'10\"", weight: "180", hairColor: "Brown", eyeColor: "Brown",
    cellPhone: "5165550123", email: "robert@example.com",
    residenceHistory: [{ fromMonth: "2020-01" }], employmentHistory: [{ fromMonth: "2020-01" }],
    safeguardMethod: "In a locked safe", safeguardName: "Pat Calder", safeguardEmail: "pat@example.com",
    safeguardIs21: "Yes", licenseType: "Premises",
  } as unknown as ApplicationValues
}
// Every disclosure answered "no" (non-LEO, so Q16 isn't asked; Q6 not asked when Q5 is no).
const readyDisclosures = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`q${i + 1}`, "no"]))

const OPTS = { portalTrack: "nyc_resident", signedRecordSatisfied: true }
const PHO_SATISFIED = [{ reqCode: "PHO-01", status: "satisfied" }]

describe("readiness gate on a photo awaiting conversion", () => {
  it("with the photo pending conversion, the case is NOT ready to enter (email holds)", () => {
    const r = computePortalReadiness(readyValues(), readyDisclosures, PHO_SATISFIED, {
      ...OPTS,
      conversionPendingReqCodes: ["PHO-01"],
    })
    expect(r.readyToEnter).toBe(false)
    expect(r.enterMissing.some((m) => /preparing your photo/i.test(m.label))).toBe(true)
    expect(r.readyToFinalize).toBe(false)
  })

  it("the SAME case with the photo converted is ready to enter (no regression)", () => {
    const r = computePortalReadiness(readyValues(), readyDisclosures, PHO_SATISFIED, {
      ...OPTS,
      conversionPendingReqCodes: [],
    })
    expect(r.readyToEnter).toBe(true)
    expect(r.enterMissing).toEqual([])
  })

  it("a conversion-pending starred slot never counts as satisfied for finalize", () => {
    // Even marked satisfied, a photo the portal will reject can't make the case finalizable.
    const r = computePortalReadiness(readyValues(), readyDisclosures, PHO_SATISFIED, {
      ...OPTS,
      conversionPendingReqCodes: ["PHO-01"],
    })
    expect(r.finalizeMissing.some((m) => /Photograph/i.test(m.label))).toBe(true)
  })
})

describe("no surface still tells the applicant a PDF is rejected (finding 8 follow-up)", () => {
  const NO_PDF_REJECT = /PDF is rejected|NOT a PDF|no PDF|reject.*PDF|image only/i
  it("the PHO-01 action copy accepts any format and never says PDF is rejected", () => {
    const src = readFileSync("lib/requirements/actions.ts", "utf8")
    const block = src.slice(src.indexOf('"PHO-01"'), src.indexOf('"PHO-01"') + 1400)
    expect(block).not.toMatch(NO_PDF_REJECT)
    expect(block).toMatch(/any common format|any common photo|we.?ll format it|we handle the format/i)
  })
  it("the photo example + the uploader no longer imply the applicant must supply a portal-ready image", () => {
    expect(readFileSync("components/portal/document-example.tsx", "utf8")).not.toMatch(NO_PDF_REJECT)
  })
  it("the active registry migration accepts a PDF here and routes it for conversion", () => {
    const migration = readFileSync("supabase/migrations/20261004000300_special_carry_nassau_corrections.sql", "utf8")
    const block = migration.slice(migration.indexOf("'PHO-01'"))
    expect(block).not.toMatch(NO_PDF_REJECT)
    expect(block).toMatch(/PDF.*staff conversion/i)
  })
})
