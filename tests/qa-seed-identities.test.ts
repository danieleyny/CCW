/**
 * P2.4 — the sponsor-test seed must isolate a run by QA_SUFFIX so it can never touch,
 * collide with, or delete the unsuffixed set. A silent fallback on a malformed suffix
 * once created a stray unsuffixed case in production; that must now throw.
 */
import { describe, expect, it } from "vitest"
import { qaSuffix, qaSeedIdentities } from "@/lib/qa/seed-identities"

describe("QA seed suffix isolation", () => {
  it("a suffixed run shares NO identity with the unsuffixed set", () => {
    const base = qaSeedIdentities(qaSuffix(""))
    const qa2 = qaSeedIdentities(qaSuffix("-qa2"))
    for (const key of Object.keys(base) as (keyof typeof base)[]) {
      expect(qa2[key]).not.toBe(base[key])
    }
    // The suffix lands in the email plus-part and the company name, as expected.
    expect(qa2.applicantEmail).toBe("se2018+applicant-qa2@gmail.com")
    expect(qa2.sponsorEmail).toBe("se2018+sponsor-qa2@gmail.com")
    expect(qa2.safeguardEmail).toBe("se2018+safeguard-qa2@gmail.com")
    expect(qa2.companyName).toBe("Test Guard Co.-qa2")
  })

  it("the empty suffix is the base set", () => {
    expect(qaSeedIdentities(qaSuffix("")).applicantEmail).toBe("se2018+applicant@gmail.com")
  })

  it("two different suffixes never collide on any identity", () => {
    const a = qaSeedIdentities(qaSuffix("-qa2"))
    const b = qaSeedIdentities(qaSuffix("-qa3"))
    expect(new Set([...Object.values(a), ...Object.values(b)]).size).toBe(Object.values(a).length * 2)
  })

  it("a malformed suffix is REFUSED, never silently dropped to the unsuffixed set", () => {
    for (const bad of ["qa2", "-qa 2", "-qa.2", "-qa/2", "-", "-qa_2", " -qa2"]) {
      expect(() => qaSuffix(bad)).toThrow(/QA_SUFFIX/)
    }
  })
})
