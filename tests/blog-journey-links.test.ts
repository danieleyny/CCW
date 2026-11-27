import { describe, expect, it } from "vitest"
import { selectJourneyLinks } from "@/lib/blog/journey-links"

describe("article journey links", () => {
  it("selects relevant next steps from the article topic", () => {
    const links = selectJourneyLinks({
      title: "The 18-Hour CCIA Course, Explained",
      description: "What the training certificate requires and when to schedule an instructor.",
      sectionTitles: ["Live-fire training", "Certificate timing"],
    })

    expect(links.map((link) => link.href)).toContain("/instructors")
    expect(links.map((link) => link.href)).toContain("/timeline")
  })

  it("falls back to useful process pages for a topic without a specific match", () => {
    expect(selectJourneyLinks({ title: "A focused guide", description: "Plain information." })).toEqual([
      expect.objectContaining({ href: "/requirements" }),
      expect.objectContaining({ href: "/checklist" }),
      expect.objectContaining({ href: "/how-it-works" }),
    ])
  })

  it("does not repeat a scored link when adding fallbacks", () => {
    const links = selectJourneyLinks({
      title: "Proof of residence documents",
      description: "Prepare address records before upload.",
    })

    expect(new Set(links.map((link) => link.href)).size).toBe(links.length)
  })
})
