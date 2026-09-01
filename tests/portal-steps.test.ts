import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { PORTAL_STEPS, PORTAL_UPLOAD_SLOTS, REQUIRED_UPLOAD_CODES, questionStepNo } from "@/config/portal-steps"
import { buildApplicationValues } from "@/lib/forms/application"
import { buildPortalWorksheet } from "@/lib/disclosures/worksheet-portal"
import type { WizardAnswers } from "@/lib/intake/answers"

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
