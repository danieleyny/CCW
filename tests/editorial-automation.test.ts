import { describe, expect, it } from "vitest"
import {
  assertTrustedEditorialSourceUrl,
  validateAutomatedArticle,
} from "@/lib/blog/automation"

function validDraft() {
  return {
    title: "How NYC applicants can organize proof of residence",
    description: "A practical guide to organizing residence records for an NYC handgun-license application.",
    targetQuery: "nyc handgun license proof of residence",
    kind: "guide" as const,
    tag: "Documents" as const,
    summary: "An original applicant-focused guide grounded in the current official instructions and designed for human review.",
    contentMarkdown: `${"A supported applicant-focused sentence. ".repeat(90)}\n\n[Official source](https://www.nyc.gov/example)`,
    usedSourceUrls: ["https://www.nyc.gov/example"],
    sourceEvidence: [{
      url: "https://www.nyc.gov/example",
      supportedFacts: ["The source says applicants use the official licensing process."],
    }],
    reviewWarnings: ["A human must confirm every claim against the live source."],
  }
}

describe("editorial automation guardrails", () => {
  it("restricts automated research to the curated government hosts", () => {
    expect(assertTrustedEditorialSourceUrl("https://www.nyc.gov/example").hostname).toBe("www.nyc.gov")
    expect(() => assertTrustedEditorialSourceUrl("https://example.com/pretend-rule")).toThrow(/not approved/)
    expect(() => assertTrustedEditorialSourceUrl("http://www.nyc.gov/insecure")).toThrow(/not approved/)
  })

  it("accepts source-backed Markdown using only approved links", () => {
    expect(() => validateAutomatedArticle(validDraft(), new Set(["https://www.nyc.gov/example"]))).not.toThrow()
  })

  it("blocks unknown sources, unsafe links and prohibited promises", () => {
    const unknownSource = { ...validDraft(), usedSourceUrls: ["https://example.com/story"] }
    expect(() => validateAutomatedArticle(unknownSource, new Set(["https://www.nyc.gov/example"]))).toThrow(/unapproved source/)

    const unsafeLink = { ...validDraft(), contentMarkdown: `${validDraft().contentMarkdown}\n\n[Other](https://example.com/story)` }
    expect(() => validateAutomatedArticle(unsafeLink, new Set(["https://www.nyc.gov/example"]))).toThrow(/outside the approved source set/)

    const promise = { ...validDraft(), contentMarkdown: `${validDraft().contentMarkdown}\n\nWe guarantee your result.` }
    expect(() => validateAutomatedArticle(promise, new Set(["https://www.nyc.gov/example"]))).toThrow(/prohibited/)
  })
})
