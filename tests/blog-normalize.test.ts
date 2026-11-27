import { describe, expect, it } from "vitest"
import { boldHeadingLines, normalizeArticleMarkdown } from "@/lib/blog/normalize"

const title = "Can You Apply Without a New York Driver's License?"

describe("normalizeArticleMarkdown", () => {
  it("promotes the live article's bold-only section labels", () => {
    const input = `# ${title}

**Identity and Residence Are Separate Requirements**
The NYPD asks for identity and residence.

**Accepted Photo Identification:**
Use a current government ID.`
    const result = normalizeArticleMarkdown(input, { title })
    expect(result).not.toContain("# Can You Apply")
    expect(result).toContain("## Identity and Residence Are Separate Requirements")
    expect(result).toContain("## Accepted Photo Identification")
  })

  it("repairs compact H2s and strips a Markdown fence", () => {
    expect(normalizeArticleMarkdown("```markdown\n##Sources\n\nText\n```", { title }))
      .toBe("## Sources\n\nText")
  })

  it("leaves inline, list and blockquote bold text alone", () => {
    const input = `A sentence with **bold text** inside it.

- **Photo ID** — current identification

> **Note:** Confirm the current rule.`
    expect(normalizeArticleMarkdown(input, { title })).toBe(input)
    expect(boldHeadingLines(input)).toEqual([])
  })

  it("allows a short bold question but not sentence-like bold paragraphs", () => {
    const input = `**What should I prepare?**

Answer.

**This is a complete sentence.**

More.`
    expect(normalizeArticleMarkdown(input, { title })).toContain("## What should I prepare?")
    expect(normalizeArticleMarkdown(input, { title })).toContain("**This is a complete sentence.**")
  })

  it("removes a legacy title line and divider when it contains the current title", () => {
    const input = `Can You Apply for an NYC Gun License Without a New York Driver's License?

***
Body copy.`
    expect(normalizeArticleMarkdown(input, { title: "NYC Gun License Without a New York Driver's License" })).toBe("Body copy.")
  })
})
