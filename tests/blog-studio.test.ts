import { describe, expect, it } from "vitest"
import {
  articleWordCount,
  generatedDraftIssues,
  markdownSafetyIssues,
  parseSourceUrls,
  publicationReadiness,
  slugifyArticle,
  unsupportedNumericClaims,
} from "@/lib/blog/validation"

describe("article studio guardrails", () => {
  it("creates clean, stable slugs", () => {
    expect(slugifyArticle("  Proof of Residence — NYC! ")).toBe("proof-of-residence-nyc")
  })

  it("normalizes and deduplicates secure source URLs", () => {
    expect(parseSourceUrls("https://nyc.gov/a\nhttps://nyc.gov/a, https://nypdonline.org/b")).toEqual([
      "https://nyc.gov/a",
      "https://nypdonline.org/b",
    ])
    expect(() => parseSourceUrls("http://example.com")).toThrow(/https/)
  })

  it("blocks executable MDX and unsafe links", () => {
    expect(markdownSafetyIssues("import X from 'x'\n<X />\n[bad](javascript:alert(1))")).toHaveLength(3)
    expect(markdownSafetyIssues("## Safe heading\n\nA [source](https://nyc.gov).")) .toEqual([])
  })

  it("does not count Markdown decoration as article words", () => {
    expect(articleWordCount("## A title\n\nThis is a short paragraph.")).toBe(7)
  })

  it("rejects short generated drafts and unresolved placeholders", () => {
    expect(generatedDraftIssues("A short draft with TODO: finish this.")).toEqual(expect.arrayContaining([
      expect.stringMatching(/at least 700 words/),
      expect.stringMatching(/placeholders/),
    ]))

    const complete = `## Direct answer\n\n${Array.from({ length: 710 }, (_, index) => `supported${index}`).join(" ")}\n\n## What to prepare\n\nUse the official instructions.\n\n## Sources\n\n- [Official source](https://www.nyc.gov/example)`
    expect(generatedDraftIssues(complete)).toEqual([])
  })

  it("detects numeric claims that are absent from the supplied evidence", () => {
    expect(unsupportedNumericClaims("Documents are usually valid for 60 to 90 days.", "Use a current document.")).toEqual(["60", "90"])
    expect(unsupportedNumericClaims("Complete the 16-hour course.", "The official source requires 16 hours.")).toEqual([])
  })

  it("requires both human checkpoints before publication", () => {
    const content = [
      "A direct, useful answer for an NYC applicant.",
      "",
      "## What the official instructions say",
      "",
      `${Array.from({ length: 710 }, (_, index) => `word${index}`).join(" ")} [NYPD guidance](https://www.nyc.gov/example).`,
      "",
      "## What to prepare",
      "",
      "Use the [requirements guide](https://gunlicensenyc.com/requirements) and [document checklist](https://gunlicensenyc.com/checklist) to organize the records.",
      "",
      "## Sources",
      "",
      "- [NYPD guidance](https://www.nyc.gov/example)",
    ].join("\n")
    const base = {
      title: "A specific NYC licensing guide",
      slug: "specific-nyc-licensing-guide",
      description: "A clear and properly sized search description for this verified licensing guide.",
      content,
      sourceUrls: ["https://www.nyc.gov/example"],
      sourceNotes: "https://www.nyc.gov/example\n- This official page supports the application-process statements used in the draft.",
      needsLegalReview: true,
    }
    expect(publicationReadiness(base).ready).toBe(false)
    expect(publicationReadiness({ ...base, content: `${base.content} TODO: finish` }).checks.find((check) => check.key === "placeholders")?.passed).toBe(false)
    expect(publicationReadiness({ ...base, factCheckedAt: "2026-11-25" }).ready).toBe(false)
    expect(publicationReadiness({ ...base, factCheckedAt: "2026-11-25", legalReviewedAt: "2026-11-25" }).ready).toBe(true)
    expect(publicationReadiness({ ...base, factCheckedAt: "2026-11-25", legalReviewedAt: "2026-11-25" }).score).toBeGreaterThanOrEqual(90)
  })

  it("blocks structurally weak copy even when it is long enough", () => {
    const content = Array.from({ length: 750 }, (_, index) => `word${index}`).join(" ")
    const report = publicationReadiness({
      title: "A specific NYC licensing guide",
      slug: "specific-nyc-licensing-guide",
      description: "A clear and properly sized search description for this verified licensing guide.",
      content,
      sourceUrls: ["https://www.nyc.gov/example"],
      sourceNotes: "https://www.nyc.gov/example\n- This official page supports the statements used in the draft.",
      factCheckedAt: "2026-11-25",
      needsLegalReview: true,
      legalReviewedAt: "2026-11-25",
    })
    expect(report.ready).toBe(false)
    expect(report.checks.find((check) => check.key === "h2_structure")?.passed).toBe(false)
    expect(report.checks.find((check) => check.key === "sources_cited")?.passed).toBe(false)
  })
})

