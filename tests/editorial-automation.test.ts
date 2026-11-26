import { describe, expect, it } from "vitest"
import {
  assertTrustedEditorialSourceUrl,
  validateAutomatedArticle,
} from "@/lib/blog/automation"

function validDraft() {
  const source = "https://www.nyc.gov/example"
  return {
    title: "How NYC applicants can organize proof of residence",
    description: "A practical guide to organizing residence records for an NYC handgun-license application.",
    targetQuery: "nyc handgun license proof of residence",
    kind: "guide" as const,
    tag: "Documents" as const,
    summary: "An original applicant-focused guide grounded in the current official instructions and designed for human review.",
    contentMarkdown: [
      "A direct, supported answer for an NYC applicant.",
      "",
      "## What the official instructions say",
      "",
      `${"A supported applicant-focused sentence. ".repeat(150)} [Official source](${source}).`,
      "",
      "## How to organize the records",
      "",
      "Use the [requirements guide](https://gunlicensenyc.com/requirements) and [document checklist](https://gunlicensenyc.com/checklist) to stay organized.",
      "",
      "## Sources",
      "",
      `- [Official source](${source})`,
    ].join("\n"),
    usedSourceUrls: [source],
    sourceEvidence: [{
      url: source,
      supportedFacts: ["The source says applicants use the official licensing process."],
    }],
    reviewWarnings: ["A human must confirm every claim against the live source."],
  }
}

describe("editorial automation guardrails", () => {
  it("restricts automated research to the curated government hosts", () => {
    expect(assertTrustedEditorialSourceUrl("https://www.nyc.gov/example").hostname).toBe("www.nyc.gov")
    expect(assertTrustedEditorialSourceUrl("https://licensing.nypdonline.org/new-app-instruction/").hostname).toBe("licensing.nypdonline.org")
    expect(assertTrustedEditorialSourceUrl("https://www.nysenate.gov/legislation/laws/PEN/400.00").hostname).toBe("www.nysenate.gov")
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
