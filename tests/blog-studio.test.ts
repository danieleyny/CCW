import { describe, expect, it } from "vitest"
import {
  articleWordCount,
  markdownSafetyIssues,
  parseSourceUrls,
  publicationReadiness,
  slugifyArticle,
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

  it("requires both human checkpoints before publication", () => {
    const content = Array.from({ length: 510 }, (_, index) => `word${index}`).join(" ")
    const base = {
      title: "A specific NYC licensing guide",
      slug: "specific-nyc-licensing-guide",
      description: "A clear and properly sized search description for this verified licensing guide.",
      content,
      sourceUrls: ["https://www.nyc.gov/example"],
      needsLegalReview: true,
    }
    expect(publicationReadiness(base).ready).toBe(false)
    expect(publicationReadiness({ ...base, factCheckedAt: "2026-11-25" }).ready).toBe(false)
    expect(publicationReadiness({ ...base, factCheckedAt: "2026-11-25", legalReviewedAt: "2026-11-25" }).ready).toBe(true)
  })
})

