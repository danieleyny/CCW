import { describe, expect, it } from "vitest"
import { lonStatementsFor, lonFieldsFor, requiredLonFieldsFor, REQUIRED_LON_STATEMENTS } from "@/lib/requirements/lon"
import { formTemplate } from "@/lib/forms/templates"

const lon = formTemplate("nypd_letter_of_necessity")!
const build = (track: string, lops: Record<string, string>) => (lon.build!({ licenseTrack: track, ...lops }).text ?? {}) as Record<string, string>
const requires = (track: string) => (typeof lon.requires === "function" ? lon.requires({ licenseTrack: track }) : lon.requires) ?? []

const ALL_LOPS = { lop1: "L1", lop2: "L2", lop3: "L3", lop4: "L4", lop5: "L5", lop6: "L6" }

describe("F1 — required LON fields derive from lonScope (never a field the applicant can't see)", () => {
  it("concealed carry requires only Statement 3 (Statement 1 is out of scope)", () => {
    expect(requiredLonFieldsFor("concealed_carry")).toEqual(["LetterOfNecessity3"])
    expect(requires("concealed_carry")).toEqual(["LetterOfNecessity3"])
    // The old hardcoded requirement LetterOfNecessity1 must NOT appear for CC.
    expect(requires("concealed_carry")).not.toContain("LetterOfNecessity1")
  })
  it("carry guard (sees statement 1) requires both 1 and 3", () => {
    expect(requiredLonFieldsFor("carry_guard")).toEqual(["LetterOfNecessity1", "LetterOfNecessity3"])
  })
  it("required statements stay in step with the questionnaire", () => {
    expect(REQUIRED_LON_STATEMENTS).toEqual([1, 3])
  })
})

describe("F4 — build() prints only in-scope boxes; out-of-scope stay BLANK", () => {
  it("a concealed-carry LON prints 3/4/6 and leaves 1/2/5 empty", () => {
    const text = build("concealed_carry", ALL_LOPS)
    expect(lonStatementsFor("concealed_carry")).toEqual([3, 4, 6])
    expect(text.LetterOfNecessity3).toBe("L3")
    expect(text.LetterOfNecessity4).toBe("L4")
    expect(text.LetterOfNecessity6).toBe("L6")
    // The "carried only for my job" box (2) and employer-disposal box (5) must not print.
    expect(text.LetterOfNecessity2).toBeUndefined()
    expect(text.LetterOfNecessity5).toBeUndefined()
    expect(text.LetterOfNecessity1).toBeUndefined()
  })
  it("a carry-guard LON prints all six", () => {
    const text = build("carry_guard", ALL_LOPS)
    for (const n of [1, 2, 3, 4, 5, 6]) expect(text[`LetterOfNecessity${n}`]).toBe(`L${n}`)
  })
})

describe("F1 completeness — a CC applicant is never told LetterOfNecessity1 is missing", () => {
  it("with lop3 present, nothing required is missing; with lop3 empty, only Statement 3 is", () => {
    // The generate action checks missingRequired = requires ∩ empty; simulate it.
    const emptyFor = (track: string, filled: Record<string, string>) =>
      requires(track).filter((r) => !filled[`lop${r.replace("LetterOfNecessity", "")}`])
    expect(emptyFor("concealed_carry", { lop3: "done" })).toEqual([])
    expect(emptyFor("concealed_carry", {})).toEqual(["LetterOfNecessity3"])
    // Even with everything but lop1 blank, a CC applicant is never blocked on lop1.
    expect(emptyFor("concealed_carry", { lop3: "x", lop4: "y", lop6: "z" })).toEqual([])
  })
})
