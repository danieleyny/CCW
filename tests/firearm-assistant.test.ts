import { describe, expect, it } from "vitest"
import { isFirearmAppHost } from "@/lib/firearm-site"
import {
  containsSensitiveData,
  needsAttorneyBoundary,
  sourcesForQuestion,
} from "@/lib/ai/firearm-assistant"

describe("Firearm License NYC paid assistant boundaries", () => {
  it("only recognizes the dedicated Firearm License NYC application host", () => {
    expect(isFirearmAppHost("app.firearmlicensenyc.com")).toBe(true)
    expect(isFirearmAppHost("gunlicensenyc.com")).toBe(false)
  })

  it("blocks common personal identifiers before a provider request", () => {
    expect(containsSensitiveData("Email me at person@example.com")).toBe(true)
    expect(containsSensitiveData("My SSN is 123-45-6789")).toBe(true)
    expect(containsSensitiveData("What documents prove residence?")).toBe(false)
  })

  it("adds the attorney boundary for case-specific legal-risk subjects", () => {
    expect(needsAttorneyBoundary("Does a dismissed arrest affect eligibility?")).toBe(true)
    expect(needsAttorneyBoundary("Where do I upload my passport photo?")).toBe(false)
  })

  it("selects approved official sources without letting the model invent URLs", () => {
    const sources = sourcesForQuestion("I own a licensed gun in New Jersey. Do I report it?")
    expect(sources.length).toBeGreaterThan(0)
    expect(sources.every((source) => source.url.startsWith("https://"))).toBe(true)
  })
})
