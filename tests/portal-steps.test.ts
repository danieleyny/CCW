import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import {
  PORTAL_STEPS,
  SPECIAL_CARRY_STEPS,
  PORTAL_UPLOAD_SLOTS,
  REQUIRED_UPLOAD_CODES,
  questionStepNo,
  portalStepsFor,
  portalTrackForCase,
  uploadSlotsFor,
} from "@/config/portal-steps"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

const emptyValues = () => buildApplicationValues({}, {} as WizardAnswers, {})

describe("portal-steps — the single source of truth", () => {
  it("has 17 steps, numbered 1..17 in order", () => {
    expect(PORTAL_STEPS.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })
  it("the three question steps cover disclosure questions 1..16 with no gap or overlap", () => {
    const covered = new Set<number>()
    for (const s of PORTAL_STEPS) {
      if (s.kind !== "questions" || !s.range) continue
      for (let n = s.range[0]; n <= s.range[1]; n++) covered.add(n)
    }
    expect([...covered].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    expect(questionStepNo(6)).toBe(8)
    expect(questionStepNo(7)).toBe(9)
    expect(questionStepNo(16)).toBe(10)
  })
  it("upload slots have unique zip bases and required = starred slots' codes", () => {
    const bases = PORTAL_UPLOAD_SLOTS.map((s) => s.zipBase)
    expect(new Set(bases).size).toBe(bases.length)
    expect(REQUIRED_UPLOAD_CODES).toEqual(PORTAL_UPLOAD_SLOTS.filter((s) => s.starred).flatMap((s) => s.reqCodes))
  })
  it("has the seven real portal slots + the Additional Documents catch-all, no citizenship slot", () => {
    expect(PORTAL_UPLOAD_SLOTS.map((s) => s.portalLabel)).toEqual([
      "Photograph", "Photo ID", "DOB Proof", "Residence Proof", "Safeguard", "Cohabitant", "Training Documents", "Additional Documents",
    ])
    expect(PORTAL_UPLOAD_SLOTS.some((s) => /citizen/i.test(s.portalLabel))).toBe(false)
    // Cohabitant is portal-starred.
    expect(PORTAL_UPLOAD_SLOTS.find((s) => s.portalLabel === "Cohabitant")?.starred).toBe(true)
    // Required codes: the starred slots, cohabitant either/or included.
    expect([...REQUIRED_UPLOAD_CODES].sort()).toEqual(["COH-01", "COH-02", "IDN-01", "IDN-02", "PHO-01", "RES-01", "SGI-01"])
    expect(REQUIRED_UPLOAD_CODES).not.toContain("IDN-03")
  })
})

describe("the required-upload list lives in exactly one place", () => {
  it("no module other than config/portal-steps.ts declares its own required-upload codes", () => {
    // Walk lib/ + app/ + config/ and fail if any file (besides portal-steps.ts)
    // hand-rolls a list of required upload codes — the drift portal-steps.ts prevents.
    const root = process.cwd()
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue
          walk(full)
        } else if (/\.(ts|tsx)$/.test(entry.name) && !full.endsWith(join("config", "portal-steps.ts"))) {
          const src = readFileSync(full, "utf8")
          // The fingerprint of a hand-rolled required-upload list is a LOCAL declaration
          // named like REQUIRED_UPLOAD… — importing the canonical one is fine.
          if (/\b(const|let|var)\s+REQUIRED_UPLOAD\w*\s*[:=]/.test(src)) offenders.push(full.replace(root + "/", ""))
        }
      }
    }
    for (const d of ["lib", "app", "config"]) walk(join(root, d))
    expect(offenders).toEqual([])
  })
})

describe("worksheet derives its order and headings from PORTAL_STEPS", () => {
  const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, {})
  it("emits exactly the 17 steps, in order, with the portal's verbatim titles", () => {
    expect(w.map((s) => s.no)).toEqual(PORTAL_STEPS.map((s) => s.no))
    expect(w.map((s) => s.title)).toEqual(PORTAL_STEPS.map((s) => s.title))
  })
  it("uploads (13) and checkpoints (15/16/17) carry a note, not fields", () => {
    const uploads = w.find((s) => s.no === 13)!
    expect(uploads.kind).toBe("uploads")
    expect(uploads.fields).toHaveLength(0)
    expect(uploads.note).toBeTruthy()
    for (const no of [15, 16, 17]) {
      const c = w.find((s) => s.no === no)!
      expect(c.kind).toBe("checkpoint")
      expect(c.note).toBeTruthy()
    }
  })
})

describe("portalTrackForCase resolves the walked Special Carry population (non-resident, non-sponsored)", () => {
  it("a non-resident concealed_carry case IS Special Carry", () => {
    expect(portalTrackForCase({ clientTrack: "non_resident", licenseTrack: "concealed_carry" })).toBe("special_carry")
    // The requirements engine's own signal — the special_carry jurisdiction — agrees.
    expect(portalTrackForCase({ jurisdictionKey: "special_carry", licenseTrack: "concealed_carry" })).toBe("special_carry")
  })
  it("resident / business cases are NYC-resident", () => {
    expect(portalTrackForCase({ clientTrack: "resident", licenseTrack: "concealed_carry" })).toBe("nyc_resident")
    expect(portalTrackForCase({ clientTrack: "business", licenseTrack: "concealed_carry" })).toBe("nyc_resident")
    expect(portalTrackForCase({})).toBe("nyc_resident")
  })
  it("a SPONSORED armed-guard track falls back even when the applicant is non-resident (not walked)", () => {
    // special_carry_guard / carry_guard / sponsored_unresolved are a different, un-walked
    // application — they must NOT inherit the Special Carry sequence.
    expect(portalTrackForCase({ clientTrack: "non_resident", licenseTrack: "special_carry_guard" })).toBe("nyc_resident")
    expect(portalTrackForCase({ clientTrack: "non_resident", licenseTrack: "sponsored_unresolved" })).toBe("nyc_resident")
    expect(portalTrackForCase({ clientTrack: "non_resident", licenseTrack: "carry_guard" })).toBe("nyc_resident")
  })
})

describe("track-aware: the Special Carry flow is a different composition, not a shift", () => {
  it("portalStepsFor('special_carry') is 17 steps with the county screen at 5 and the fee waiver at 13", () => {
    const steps = portalStepsFor("special_carry")
    expect(steps.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
    expect(steps[4].title).toBe("Out of city license information")
    expect(steps[12].title).toBe("Law Enforcement Application Fee Waiver")
    expect(steps[12].key).toBe("fee_waiver")
    // Additional licenses is its own screen at 6 (NYC-resident folds it into "Other Licenses" at 5).
    expect(steps[5].title).toBe("Additional licenses")
  })

  it("falls back to the NYC-resident list for any un-walked track — DELIBERATELY (same reference)", () => {
    // Assert on the documented fallback by identity, so this fails LOUDLY the day a real
    // Special Carry Guard list is added and this stops being a fallback.
    expect(portalStepsFor("special_carry_guard")).toBe(PORTAL_STEPS)
    expect(portalStepsFor("concealed_carry")).toBe(PORTAL_STEPS)
    expect(portalStepsFor(null)).toBe(PORTAL_STEPS)
    expect(portalStepsFor("special_carry")).toBe(SPECIAL_CARRY_STEPS)
  })

  it("the question ranges are identical across tracks; only the step NUMBER shifts", () => {
    // 8/9/10 on NYC-resident, 9/10/11 on Special Carry — same [1,6]/[7,12]/[13,16] ranges.
    expect(questionStepNo(6, "nyc_resident")).toBe(8)
    expect(questionStepNo(6, "special_carry")).toBe(9)
    expect(questionStepNo(7, "special_carry")).toBe(10)
    expect(questionStepNo(16, "special_carry")).toBe(11)
  })

  it("no consumer hardcodes the uploads step number: it resolves to 13 on NYC-resident, 15 on Special Carry", () => {
    const resStep = portalStepsFor("nyc_resident").find((s) => s.kind === "uploads")!
    const scStep = portalStepsFor("special_carry").find((s) => s.kind === "uploads")!
    expect(resStep.no).toBe(13)
    expect(scStep.no).toBe(15)
    // And the worksheet emits the uploads section at the resolved number, not a literal.
    const resW = buildPortalWorksheet(emptyValues(), {}, { portalTrack: "nyc_resident" })
    const scW = buildPortalWorksheet(emptyValues(), {}, { portalTrack: "special_carry" })
    expect(resW.find((s) => s.kind === "uploads")!.no).toBe(13)
    expect(scW.find((s) => s.kind === "uploads")!.no).toBe(15)
  })

  it("the Special Carry Safeguard upload slot accepts the home-county carry licence (SGI-01 OR SCG-01)", () => {
    const scSafeguard = uploadSlotsFor("special_carry").find((s) => /Safeguard/i.test(s.portalLabel))!
    expect(scSafeguard.reqCodes).toEqual(["SGI-01", "SCG-01"])
    // NYC-resident keeps SGI-01 only (no county licence on that flow).
    expect(uploadSlotsFor("nyc_resident").find((s) => s.portalLabel === "Safeguard")!.reqCodes).toEqual(["SGI-01"])
  })

  it("Special Carry does NOT present step 16 as a review checkpoint — it is Counsel and Preparer", () => {
    const step16 = SPECIAL_CARRY_STEPS.find((s) => s.no === 16)!
    expect(step16.kind).toBe("fields")
    expect(step16.key).toBe("counsel_preparer")
    // There is no separate review checkpoint before the end on this track.
    expect(SPECIAL_CARRY_STEPS.filter((s) => s.key === "review")).toHaveLength(0)
  })

  it("nothing on the Special Carry track names a step as the irreversible one (Phase 8 — unconfirmed)", () => {
    for (const step of SPECIAL_CARRY_STEPS) {
      expect(step.checkpoint ?? "", `step ${step.no}`).not.toMatch(/irreversible/i)
    }
    // The NYC-resident affirmations step DOES (correctly) mark itself irreversible.
    expect(PORTAL_STEPS.find((s) => s.key === "affirmations")!.checkpoint).toMatch(/IRREVERSIBLE/)
  })

  it("Special Carry worksheet shows the county licence at 5 and the fee-waiver + statements screens", () => {
    const w = buildPortalWorksheet(emptyValues(), {}, { portalTrack: "special_carry", isRetiredLeo: true })
    const outOfCity = w.find((s) => s.no === 5)!
    expect(outOfCity.title).toBe("Out of city license information")
    expect(outOfCity.fields.some((f) => f.label === "Basic License Number")).toBe(true)
    expect(w.find((s) => s.title === "Law Enforcement Application Fee Waiver")).toBeTruthy()
    expect(w.find((s) => s.no === 14)!.fields.length).toBeGreaterThan(0) // sworn statements
    // Step 17 review-and-copy is a checkpoint that produces the filed-application artifact.
    const final = SPECIAL_CARRY_STEPS.find((s) => s.no === 17)!
    expect(final.kind).toBe("checkpoint")
    expect(final.producesReqCode).toBe("APP-01")
    expect(final.producesDocumentType).toBe("filed_application_copy")
  })

  it("confidentiality: a withdrawal election and a Q14/Ground-1B mismatch surface to staff (greyed, not missing)", () => {
    // election=withdraw → a withdrawal warning; q14=Yes with g1b unchecked → a cross-check.
    const w = buildPortalWorksheet(
      emptyValues(),
      { q14: "yes" },
      { portalTrack: "special_carry", confidentiality: { requesting: "yes", election: "withdraw" } }
    )
    const con = w.find((s) => /Confidentiality/i.test(s.title))!
    const withdraw = con.fields.find((f) => /Withdrawal election/i.test(f.label))!
    expect(withdraw.notApplicable).toBe(true)
    expect(withdraw.missing).toBe(false)
    const crossCheck = con.fields.find((f) => /Cross-check/i.test(f.label))!
    expect(crossCheck).toBeTruthy()
    expect(crossCheck.missing).toBe(false)
  })
})

describe("the fake-N/A bug is fixed: an inapplicable question is a real not-applicable state", () => {
  it("Q6 (dishonorable discharge) with Q5≠Yes is notApplicable, greyed, NOT a typed \"N/A\", NOT missing", () => {
    // Q5 answered "no" → Q6 is not asked.
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), { q5: "no" }, {})
    const step8 = w.find((s) => s.no === 8)!
    const q6 = step8.fields.find((f) => f.label.startsWith("6."))!
    expect(q6.notApplicable).toBe(true)
    expect(q6.missing).toBe(false)
    expect(q6.value).not.toBe("N/A")
    expect(q6.value.toLowerCase()).toContain("not applicable")
  })
  it("Q16 (LEO-only) for a non-LEO applicant is notApplicable, not missing", () => {
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), {}, { leo: false })
    const step10 = w.find((s) => s.no === 10)!
    const q16 = step10.fields.find((f) => f.label.startsWith("16."))!
    expect(q16.notApplicable).toBe(true)
    expect(q16.missing).toBe(false)
  })
  it("a real Yes/No answer always wins over not-applicable", () => {
    // Even though Q5≠Yes, if Q6 somehow has an explicit answer, show it.
    const w = buildPortalWorksheet(buildApplicationValues({}, {} as WizardAnswers, {}), { q5: "no", q6: "no" }, {})
    const q6 = w.find((s) => s.no === 8)!.fields.find((f) => f.label.startsWith("6."))!
    expect(q6.notApplicable).toBeFalsy()
    expect(q6.value).toBe("No")
  })
})
