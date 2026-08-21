/**
 * ACCESS CODES · Phase 1 — the matcher. Timing-safe, package-scoped, and NEVER an
 * oracle: a valid-but-wrong-package code and an unknown code return the identical
 * null. Off entirely when ACCESS_CODES is unset.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { matchAccessCode, normaliseAccessCode, accessCodesEnabled } from "@/lib/access-codes"

const CODES =
  "GLNYC-DEMO-AAAA-BBBB:full_concierge:comp:demo,GLNYC-COMP-CCCC-DDDD:*:comp:comp"

describe("access codes", () => {
  beforeEach(() => {
    process.env.ACCESS_CODES = CODES
  })
  afterEach(() => {
    delete process.env.ACCESS_CODES
  })

  it("is enabled only when configured", () => {
    expect(accessCodesEnabled()).toBe(true)
    delete process.env.ACCESS_CODES
    expect(accessCodesEnabled()).toBe(false)
  })

  it("normalises input (trim, uppercase, strip spaces, cap)", () => {
    expect(normaliseAccessCode("  glnyc-demo-aaaa-bbbb ")).toBe("GLNYC-DEMO-AAAA-BBBB")
    expect(normaliseAccessCode("a".repeat(200)).length).toBe(64)
  })

  it("matches a valid code for its package (case-insensitive) with a clean label", () => {
    const m = matchAccessCode("glnyc-demo-aaaa-bbbb", "full_concierge")
    expect(m?.flavor).toBe("demo")
    expect(m?.label).toBe("DEMO")
    expect(m?.packageKey).toBe("full_concierge")
  })

  it("a '*' code unlocks either package", () => {
    expect(matchAccessCode("GLNYC-COMP-CCCC-DDDD", "self_guided")?.flavor).toBe("comp")
    expect(matchAccessCode("GLNYC-COMP-CCCC-DDDD", "full_concierge")?.label).toBe("COMP")
  })

  it("NO ORACLE — wrong package and unknown both return null", () => {
    // The demo code is concierge-only; asking for self_guided must look identical
    // to an unknown code.
    expect(matchAccessCode("GLNYC-DEMO-AAAA-BBBB", "self_guided")).toBeNull()
    expect(matchAccessCode("GLNYC-NOPE-0000-0000", "full_concierge")).toBeNull()
    expect(matchAccessCode("", "full_concierge")).toBeNull()
  })

  it("returns null for everything when unset", () => {
    delete process.env.ACCESS_CODES
    expect(matchAccessCode("GLNYC-DEMO-AAAA-BBBB", "full_concierge")).toBeNull()
  })
})
