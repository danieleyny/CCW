import { describe, it, expect } from "vitest"
import {
  inchesFromFeetInches,
  ftInFromInches,
  inchesFromCm,
  cmFromInches,
} from "@/lib/intake/measurements"
import { partsFromIsoDay, isoDayFromParts } from "@/lib/intake/birthdate"

describe("height measurements", () => {
  it("composes feet + inches into total inches (6ft0in = 72)", () => {
    expect(inchesFromFeetInches(6, 0)).toBe(72)
    expect(inchesFromFeetInches(5, 11)).toBe(71)
    expect(inchesFromFeetInches(4, 6)).toBe(54)
  })

  it("round-trips inches → ft/in for display", () => {
    expect(ftInFromInches(72)).toEqual({ feet: 6, inches: 0 })
    expect(ftInFromInches(71)).toEqual({ feet: 5, inches: 11 })
  })

  it("converts cm → nearest inch and back", () => {
    // 183 cm ≈ 72 in; 180 cm ≈ 71 in
    expect(inchesFromCm(183)).toBe(72)
    expect(inchesFromCm(180)).toBe(71)
    expect(cmFromInches(72)).toBe(183)
  })

  it("keeps a ft/in entry inside the canonical 24–96 bound for real heights", () => {
    const inches = inchesFromFeetInches(6, 0)
    expect(inches).toBeGreaterThanOrEqual(24)
    expect(inches).toBeLessThanOrEqual(96)
  })
})

describe("birthdate compose/validate", () => {
  it("composes a real date into YYYY-MM-DD", () => {
    expect(isoDayFromParts("1975", "3", "9")).toBe("1975-03-09")
    expect(isoDayFromParts("1990", "12", "31")).toBe("1990-12-31")
  })

  it("rejects impossible calendar dates → ''", () => {
    expect(isoDayFromParts("1975", "2", "30")).toBe("") // Feb 30
    expect(isoDayFromParts("1975", "4", "31")).toBe("") // Apr 31
    expect(isoDayFromParts("1975", "13", "1")).toBe("") // month 13
    expect(isoDayFromParts("1975", "0", "10")).toBe("") // month 0
    expect(isoDayFromParts("1975", "6", "0")).toBe("") // day 0
  })

  it("returns '' for incomplete input (so 'enter your DOB' still fires)", () => {
    expect(isoDayFromParts("197", "3", "9")).toBe("") // partial year
    expect(isoDayFromParts("", "", "")).toBe("")
    expect(isoDayFromParts("1975", "", "9")).toBe("")
  })

  it("honors a sane year window", () => {
    expect(isoDayFromParts("1899", "6", "1")).toBe("")
    expect(isoDayFromParts("2101", "6", "1")).toBe("")
  })

  it("splits an existing YYYY-MM-DD back into typed parts for editing", () => {
    expect(partsFromIsoDay("1975-03-09")).toEqual({ y: "1975", m: "03", d: "09" })
    expect(partsFromIsoDay("")).toEqual({ y: "", m: "", d: "" })
    expect(partsFromIsoDay("not-a-date")).toEqual({ y: "", m: "", d: "" })
  })

  it("round-trips: parts → iso → parts is stable", () => {
    const iso = isoDayFromParts("1988", "7", "4")
    expect(iso).toBe("1988-07-04")
    expect(partsFromIsoDay(iso)).toEqual({ y: "1988", m: "07", d: "04" })
  })
})
