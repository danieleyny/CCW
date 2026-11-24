/**
 * Create a deliberately non-public article scaffold.
 *
 * Usage:
 *   pnpm blog:draft -- --slug nyc-topic --title "NYC Topic" --source https://example.com/source
 *
 * Drafts are stored outside content/blog, so neither the site, sitemap nor RSS
 * can publish them accidentally. A human must verify the source, write original
 * analysis, pass the checklist, and move the file into content/blog.
 */
import fs from "node:fs"
import path from "node:path"

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const slug = arg("slug")
const title = arg("title")
const source = arg("source")

if (!slug || !/^[a-z0-9-]+$/.test(slug) || !title || !source) {
  console.error('Usage: pnpm blog:draft -- --slug "lowercase-slug" --title "Title" --source "https://…"')
  process.exit(1)
}

const sourceUrl = new URL(source)
if (sourceUrl.protocol !== "https:") throw new Error("Source must use HTTPS")

const directory = path.join(process.cwd(), "content", "blog-drafts")
const file = path.join(directory, `${slug}.mdx`)
if (fs.existsSync(file)) throw new Error(`Draft already exists: ${file}`)
fs.mkdirSync(directory, { recursive: true })

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date())

const draft = `---
title: ${JSON.stringify(title)}
description: "TODO: Distinct, factual description under 155 characters."
date: ${JSON.stringify(today)}
tag: "News analysis"
status: "draft"
author: "Gun License NYC editorial team"
automationAssisted: true
source: ${JSON.stringify(sourceUrl.toString())}
---

> EDITORIAL HOLD — This file is not public. Do not move it into content/blog until every checklist item below passes.

## What happened

Write an original, factual summary. Do not copy sentences, headlines, photographs, or the article structure.

## Why it matters to a New York City applicant

Add genuinely useful NYC licensing context. Do not turn a news event into legal advice or self-defense advice.

## What the published rules say

Link primary authorities. Do not invent citations. If a rule is uncertain or case-specific, say so and route to counsel.

## Sources

- [Original reporting](${sourceUrl.toString()})
- TODO: Add the relevant primary government source.

## Pre-publication checklist

- [ ] Entire article is original; no copied or lightly rewritten passage.
- [ ] Every factual claim is supported by a linked source.
- [ ] Primary authority is used for licensing or legal rules.
- [ ] No legal advice, outcome promise, fear-based sales copy, or tactical instruction.
- [ ] Applicant-controlled filing language is accurate.
- [ ] Human fact-check and legal-boundary review completed.
- [ ] Title, description, internal links and CTA are useful rather than keyword-stuffed.
`

fs.writeFileSync(file, draft, "utf8")
console.log(file)
