/**
 * P1-3 — the number of NYPD disclosure questions is derived from the question list,
 * never hardcoded. The portal set is 16 questions; stale copy used to say "seventeen
 * questions" and "(questions 10–28)" (the old paper-form range), quietly contradicting
 * what the applicant actually answers. Every surface now reads from the derived
 * count/range, so the source of truth is the list itself.
 */
import { describe, expect, it } from "vitest"
import {
  PORTAL_DISCLOSURES,
  PORTAL_DISCLOSURE_COUNT,
  PORTAL_DISCLOSURE_FIRST,
  PORTAL_DISCLOSURE_LAST,
  PORTAL_DISCLOSURE_RANGE,
} from "@/lib/disclosures/portal-questions"
import { REQUIREMENT_ACTIONS } from "@/lib/requirements/actions"
import { QUESTIONNAIRES } from "@/lib/requirements/questionnaires"

describe("portal disclosure count is derived, not hardcoded", () => {
  it("the count equals the list length and the range spans first→last", () => {
    expect(PORTAL_DISCLOSURE_COUNT).toBe(PORTAL_DISCLOSURES.length)
    const nos = PORTAL_DISCLOSURES.map((q) => q.no)
    expect(PORTAL_DISCLOSURE_FIRST).toBe(Math.min(...nos))
    expect(PORTAL_DISCLOSURE_LAST).toBe(Math.max(...nos))
    expect(PORTAL_DISCLOSURE_RANGE).toBe(`${PORTAL_DISCLOSURE_FIRST}–${PORTAL_DISCLOSURE_LAST}`)
  })

  it("the DSC-01 help states the derived count and drops the stale 'seventeen'", () => {
    const help = REQUIREMENT_ACTIONS["DSC-01"].help ?? ""
    expect(help).toContain(`asks ${PORTAL_DISCLOSURE_COUNT} questions`)
    expect(help.toLowerCase()).not.toContain("seventeen")
  })

  it("the disclosure questionnaire intro states the derived count and drops the old 10–28 range", () => {
    const intro = QUESTIONNAIRES["disclosure-addendum"].intro ?? ""
    expect(intro).toContain(`asks these ${PORTAL_DISCLOSURE_COUNT} questions`)
    expect(intro).not.toContain("28")
  })
})
