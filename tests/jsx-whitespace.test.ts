/**
 * A RENDER assertion for the recurring JSX-whitespace-trim bug.
 *
 * When a JSX expression `{x}` or a closing tag is immediately followed by text that
 * wraps to the next source line, Babel can trim the leading space and glue the words
 * ("for Marcus Powellhas been received"). It's a rendered defect, invisible in source
 * review, and it has regressed more than once on the safeguard person's page — the first
 * line a third party reads. Source scanning can't catch it reliably (the same shape
 * renders fine elsewhere), so we RENDER the highest-risk surface and assert the words
 * stay separated. Extend with more renders as new interpolated prose is added.
 */
import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { SafeguardFlow } from "@/components/public/safeguard-flow"

describe("JSX whitespace — interpolated prose keeps its spaces when rendered", () => {
  it("the safeguard person's completed page reads 'for <name> has been received'", () => {
    const html = renderToStaticMarkup(
      createElement(SafeguardFlow, { token: "t", applicant: "Marcus Powell", initialStatus: "signed" })
    )
    expect(html).toContain("for Marcus Powell has been received")
    expect(html).not.toContain("Powellhas")
  })

  it("the safeguard flow's live steps name the applicant with spaces intact", () => {
    const html = renderToStaticMarkup(
      createElement(SafeguardFlow, { token: "t", applicant: "Dana Ruiz", initialStatus: "pending" })
    )
    expect(html).toContain("Dana Ruiz")
    // The interpolations that wrap in source: "take custody of {applicant}'s firearm",
    // "if {applicant} dies", "why {applicant} named you". None may glue to the next word.
    expect(html).toContain("if Dana Ruiz dies")
    expect(html).not.toContain("Ruizdies")
    expect(html).not.toContain("Ruiznamed")
  })
})
