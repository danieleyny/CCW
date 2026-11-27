import { describe, expect, it } from "vitest"
import { parseArticle } from "@/lib/blog/structure"

describe("parseArticle", () => {
  it("extracts the short answer, role note and source cards", () => {
    const article = parseArticle(`Opening context.

## The short answer

Yes. Identity and residence are separate requirements.

## Documents

Bring the records listed by the issuing authority.

## Your role in the application

You control and submit your own application.

## Sources

- [Required Documents Checklist](https://www.nyc.gov/example)

Requirements can change.

## Confirm current requirements

Check the issuing authority before filing.`)

    expect(article.shortAnswer).toBe("Yes. Identity and residence are separate requirements.")
    expect(article.introMarkdown).toBe("Opening context.")
    expect(article.sections.map((section) => section.kind)).toEqual(["body", "role", "sources", "body"])
    expect(article.sources).toEqual([{ title: "Required Documents Checklist", url: "https://www.nyc.gov/example", host: "nyc.gov" }])
    expect(article.sections[2].markdown).toBe("Requirements can change.")
  })

  it("de-duplicates generated section ids", () => {
    const article = parseArticle("## Records\n\nOne.\n\n## Records\n\nTwo.")
    expect(article.sections.map((section) => section.id)).toEqual(["records", "records-2"])
  })

  it("recognizes alternate short-answer headings", () => {
    const article = parseArticle("## In brief\n\nA direct answer.\n\n## Details\n\nMore.")
    expect(article.shortAnswerLabel).toBe("In brief")
    expect(article.sections.map((section) => section.title)).toEqual(["Details"])
  })

  it("extracts source cards from legacy title-and-URL bullets", () => {
    const article = parseArticle("## Sources\n\n- NYPD checklist: https://licensing.nypdonline.org/example")
    expect(article.sources).toEqual([{ title: "NYPD checklist", url: "https://licensing.nypdonline.org/example", host: "licensing.nypdonline.org" }])
  })
})
