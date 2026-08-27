/**
 * COMPLIANCE PR3 — Part A (one doc-state palette) + Part B2 (reference composition).
 */
import { describe, expect, it } from "vitest"
import { docStateStyle, chipClasses } from "@/lib/ui/doc-state"
import { referenceComposition } from "@/lib/references/composition"

describe("Part A — the one doc-state palette", () => {
  it("received is signal, needs-you is brass, approved is ok — brass means only 'your turn'", () => {
    expect(docStateStyle("received").tone).toBe("signal")
    expect(docStateStyle("needs_you").tone).toBe("brass")
    expect(docStateStyle("approved").tone).toBe("ok")
    // Nothing but needs-you (and warn's changes) is brass; received/approved are not.
    expect(docStateStyle("received").tone).not.toBe("brass")
    expect(docStateStyle("approved").tone).not.toBe("brass")
  })

  it("mass separates the states: needs-you fills, received outlines, approved ghosts", () => {
    expect(docStateStyle("needs_you").chipVariant).toBe("filled")
    expect(docStateStyle("received").chipVariant).toBe("outline")
    expect(docStateStyle("approved").chipVariant).toBe("ghost")
    // A filled chip is solid with punched-out dark text; an outline is a thin ring.
    expect(chipClasses("filled", "brass")).toContain("bg-brass")
    expect(chipClasses("outline", "signal")).toContain("border-signal")
    expect(chipClasses("ghost", "ok")).toBe("text-ok")
  })
})

describe("Part B2 — reference composition (38 RCNY §5-05(b)(8))", () => {
  const fam = { is_family: true }
  const non = { is_family: false }

  it("concealed carry (4): 2 family + 2 non-family is valid and complete", () => {
    const c = referenceComposition([fam, fam, non, non], 4)
    expect(c.maxFamily).toBe(2)
    expect(c.complete).toBe(true)
    expect(c.problem).toBeNull()
  })

  it("concealed carry (4): a THIRD family reference is invalid (the reported bug)", () => {
    const c = referenceComposition([fam, fam, fam, non], 4)
    expect(c.complete).toBe(false)
    expect(c.problem).toContain("unrelated")
  })

  it("concealed carry: the family cap is reached at 2 family references", () => {
    expect(referenceComposition([fam, fam], 4).familyCapReached).toBe(true)
    expect(referenceComposition([fam], 4).familyCapReached).toBe(false)
  })

  it("carry guard (2): no family allowed at all", () => {
    expect(referenceComposition([], 2).maxFamily).toBe(0)
    const c = referenceComposition([fam, non], 2)
    expect(c.complete).toBe(false)
    expect(c.problem).toContain("unrelated")
    // Two non-family is valid.
    expect(referenceComposition([non, non], 2).complete).toBe(true)
  })

  it("renewal (0): always complete", () => {
    expect(referenceComposition([], 0).complete).toBe(true)
  })
})
