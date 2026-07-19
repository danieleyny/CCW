/**
 * The coverage map is a compliance artifact — it claims we capture (or flag)
 * every field on the official application. These tests keep the claim honest as
 * the intake and registry evolve underneath it.
 */
import { describe, expect, it } from "vitest"
import {
  APPLICATION_COVERAGE,
  COVERAGE_SECTIONS,
  coverageGaps,
  coverageSummary,
  type CoverageField,
} from "@/config/application-coverage"
import { wizardAnswersSchema } from "@/lib/intake/schema"
import { QUESTIONNAIRE } from "@/lib/intake/answers"

const all: readonly CoverageField[] = APPLICATION_COVERAGE

describe("application coverage map", () => {
  it("every field declares a capture kind and a status", () => {
    for (const f of all) {
      expect(f.id, `field ${f.formLabel}`).toBeTruthy()
      expect(f.capture.kind).toBeTruthy()
      expect(f.status).toBeTruthy()
    }
  })

  it("field ids are unique", () => {
    const ids = all.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every section referenced by a field is a known section", () => {
    const known = new Set(COVERAGE_SECTIONS.map((s) => s.key))
    for (const f of all) expect(known.has(f.section), `${f.id} → ${f.section}`).toBe(true)
  })

  it("every intake-captured field points at a real WizardAnswers key", () => {
    // The zod schema is the authority on what the intake actually stores.
    const knownKeys = new Set(Object.keys(wizardAnswersSchema.shape))
    for (const f of all) {
      if (f.capture.kind !== "intake" || !f.capture.ref) continue
      expect(knownKeys.has(f.capture.ref), `coverage '${f.id}' → intake.${f.capture.ref}`).toBe(true)
    }
  })

  it("the questionnaire coverage entries line up with the official question set", () => {
    // Every Q10–22 questionnaire number in the map exists in QUESTIONNAIRE
    // (20a is deliberately folded into 20).
    const qNos = new Set(QUESTIONNAIRE.map((q) => q.no))
    for (const f of all) {
      if (f.capture.ref !== "questionnaire" || !f.questionNo) continue
      const n = parseInt(f.questionNo, 10)
      expect(qNos.has(n), `coverage Q${f.questionNo} has no questionnaire entry`).toBe(true)
    }
  })

  it("SSN and the social-security card are never stored", () => {
    // A regression guard on the deliberate privacy choice: these must stay
    // 'at_filing', never quietly become an intake field.
    for (const id of ["ssn", "social_security_card"]) {
      const f = all.find((x) => x.id === id)
      expect(f?.capture.kind, id).toBe("at_filing")
    }
  })

  it("the known gaps are exactly the ones we've documented", () => {
    // A named list, so adding or closing a gap is a deliberate edit to this test.
    const gapIds = coverageGaps()
      .filter((f) => f.status === "gap")
      .map((f) => f.id)
      .sort()
    expect(gapIds).toEqual(
      ["certificate_of_relief", "letter_of_necessity", "residence_precinct", "safeguard_ack_form"].sort()
    )
  })

  it("the summary counts add up to the total", () => {
    const s = coverageSummary()
    expect(s.ok + s.partial + s.atFiling + s.verify + s.gap).toBe(s.total)
    expect(s.total).toBe(all.length)
  })
})
