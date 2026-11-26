export const BLOG_POST_STATUSES = ["draft", "review", "approved", "published", "archived"] as const
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number]

export function slugifyArticle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
}

export function articleWordCount(content: string) {
  const words = content
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`\[\]()-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return words.length
}

export function parseSourceUrls(value: string) {
  const raw = value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  return [...new Set(raw.map((entry) => {
    let url: URL
    try { url = new URL(entry) }
    catch { throw new Error(`Check this source URL: ${entry}`) }
    if (url.protocol !== "https:") throw new Error("Every source must use a secure https:// URL.")
    return url.toString()
  }))]
}

/**
 * Public articles are compiled by next-mdx-remote. Keep admin-authored content
 * to ordinary Markdown so generated text can never smuggle JSX, imports or
 * executable expressions into the server-side compiler.
 */
export function markdownSafetyIssues(content: string) {
  const issues: string[] = []
  if (/^\s*(import|export)\s/m.test(content)) issues.push("Remove import and export statements.")
  if (/<\/?[a-zA-Z][^>]*>/.test(content)) issues.push("Use Markdown instead of HTML or JSX tags.")
  if (/\{[^\n{}]*\}/.test(content)) issues.push("Remove MDX expressions in braces.")
  if (/\]\(\s*(?:javascript|data):/i.test(content)) issues.push("Remove unsafe link protocols.")
  if (/!\[[^\]]*\]\([^)]*\)/.test(content)) issues.push("Article images are not supported in the editor yet.")
  return issues
}

export const GENERATED_ARTICLE_MIN_WORDS = 700
export const ARTICLE_QUALITY_MIN_SCORE = 90

const CANONICAL_ORIGIN = "https://gunlicensenyc.com"
const PROHIBITED_MARKETING_LANGUAGE = /\b(?:guarantee|expedite|fast[- ]track|approval rate|insider)\b/i

export interface ArticleQualityCheck {
  key: string
  label: string
  passed: boolean
  blocking: boolean
  weight: number
}

function normalizeUrl(value: string) {
  try { return new URL(value).toString() }
  catch { return null }
}

export function markdownLinkUrls(content: string) {
  return [...content.matchAll(/\[[^\]]+\]\((https:\/\/[^\s)]+|\/[^\s)]+)\)/g)]
    .map((match) => match[1])
}

function normalizedMarkdownLinkUrls(content: string) {
  return markdownLinkUrls(content)
    .map((value) => value.startsWith("/") ? normalizeUrl(`${CANONICAL_ORIGIN}${value}`) : normalizeUrl(value))
    .filter((value): value is string => Boolean(value))
}

function firstMeaningfulLine(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith(">")) ?? ""
}

function comparableText(value: string) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
}

function contentBeforeSources(content: string) {
  return content.split(/^##\s+sources\s*$/im)[0] ?? content
}

function sourceEvidenceCovered(sourceUrls: string[], sourceNotes: string | null | undefined) {
  const notes = sourceNotes?.trim() ?? ""
  return notes.length >= 80 && sourceUrls.every((url) => notes.includes(url))
}

/**
 * A generated draft should arrive as publication-quality copy, not as an
 * outline for the operator to finish. Keep this separate from the human
 * fact/legal review gates: automation can complete the writing, but it cannot
 * attest that a person reviewed the result.
 */
export function generatedDraftIssues(
  content: string,
  options: { title?: string; sourceUrls?: string[]; requireInternalLinks?: boolean } = {}
) {
  const issues = markdownSafetyIssues(content)
  const words = articleWordCount(content)
  if (words < GENERATED_ARTICLE_MIN_WORDS) {
    issues.push(`The generated article is ${words} words; it must be at least ${GENERATED_ARTICLE_MIN_WORDS} words.`)
  }
  if (/\b(?:TODO|TBD)\b|\[(?:add|insert|complete|verify)[^\]]*\]/i.test(content)) {
    issues.push("The generated article contains unresolved editorial placeholders.")
  }
  if ((content.match(/^##\s+.+$/gm) ?? []).length < 3) {
    issues.push("The generated article needs at least three real level-two Markdown headings.")
  }
  if (/^#\s+.+$/m.test(content)) {
    issues.push("The generated article must not repeat the page title as a level-one heading.")
  }
  if (options.title && comparableText(firstMeaningfulLine(content)) === comparableText(options.title)) {
    issues.push("The generated article repeats the page title at the start of the body.")
  }
  if (!/^##\s+sources\s*$/im.test(content)) {
    issues.push("The generated article needs a level-two Sources section.")
  }
  if (PROHIBITED_MARKETING_LANGUAGE.test(content)) {
    issues.push("The generated article contains prohibited marketing language.")
  }
  const sourceUrls = (options.sourceUrls ?? []).map(normalizeUrl).filter((url): url is string => Boolean(url))
  if (sourceUrls.length) {
    const links = new Set(normalizedMarkdownLinkUrls(content))
    if (sourceUrls.some((url) => !links.has(url))) {
      issues.push("Every supplied source must appear as a clickable Markdown citation.")
    }
    const inlineLinks = new Set(normalizedMarkdownLinkUrls(contentBeforeSources(content)))
    if (!sourceUrls.some((url) => inlineLinks.has(url))) {
      issues.push("At least one official source must be cited in context before the Sources section.")
    }
  }
  if (options.requireInternalLinks) {
    const internalLinks = normalizedMarkdownLinkUrls(content)
      .filter((url) => new URL(url).origin === CANONICAL_ORIGIN)
    if (new Set(internalLinks).size < 2) {
      issues.push("The generated article needs at least two useful internal Gun License NYC links.")
    }
  }
  return issues
}

function numericTokens(value: string) {
  return new Set(
    (value.replace(/https?:\/\/\S+/g, " ").match(/\b\d+(?:[.,]\d+)?\b/g) ?? [])
      .map((token) => token.replace(/,/g, ""))
  )
}

/** Numeric requirements and timelines are high-risk; never let the model add one from memory. */
export function unsupportedNumericClaims(content: string, evidence: string) {
  const supported = numericTokens(evidence)
  return [...numericTokens(content)].filter((token) => !supported.has(token))
}

export interface PublicationInput {
  title: string
  slug: string
  description: string
  content: string
  sourceUrls: string[]
  sourceNotes?: string | null
  factCheckedAt?: string | null
  needsLegalReview: boolean
  legalReviewedAt?: string | null
}

export function publicationReadiness(input: PublicationInput) {
  const title = input.title.trim()
  const description = input.description.trim()
  const sourceUrls = input.sourceUrls.map(normalizeUrl).filter((url): url is string => Boolean(url))
  const links = normalizedMarkdownLinkUrls(input.content)
  const externalLinks = links.filter((url) => new URL(url).origin !== CANONICAL_ORIGIN)
  const internalLinks = links.filter((url) => new URL(url).origin === CANONICAL_ORIGIN)
  const linkSet = new Set(links)
  const inlineLinkSet = new Set(normalizedMarkdownLinkUrls(contentBeforeSources(input.content)))
  const checks: ArticleQualityCheck[] = [
    { key: "title", label: "Specific article title added", passed: title.length >= 10, blocking: true, weight: 5 },
    { key: "title_focus", label: "Title is focused (25–75 characters)", passed: title.length >= 25 && title.length <= 75, blocking: false, weight: 4 },
    { key: "slug", label: "Clean article URL", passed: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug), blocking: true, weight: 4 },
    { key: "slug_focus", label: "Article URL is concise (75 characters or fewer)", passed: input.slug.length <= 75, blocking: false, weight: 2 },
    {
      key: "description",
      label: "Search description is 50–180 characters",
      passed: description.length >= 50 && description.length <= 180,
      blocking: true,
      weight: 6,
    },
    { key: "description_focus", label: "Search description is focused (70–160 characters)", passed: description.length >= 70 && description.length <= 160, blocking: false, weight: 4 },
    { key: "body", label: `Article has at least ${GENERATED_ARTICLE_MIN_WORDS} words`, passed: articleWordCount(input.content) >= GENERATED_ARTICLE_MIN_WORDS, blocking: true, weight: 8 },
    {
      key: "placeholders",
      label: "No unresolved draft placeholders",
      passed: !/\b(?:TODO|TBD)\b|\[(?:add|insert|complete|verify)[^\]]*\]/i.test(input.content),
      blocking: true,
      weight: 7,
    },
    { key: "h2_structure", label: "At least three real section headings", passed: (input.content.match(/^##\s+.+$/gm) ?? []).length >= 3, blocking: true, weight: 8 },
    { key: "body_title", label: "Body does not duplicate the page title", passed: !/^#\s+.+$/m.test(input.content) && comparableText(firstMeaningfulLine(input.content)) !== comparableText(title), blocking: true, weight: 4 },
    { key: "source_section", label: "Level-two Sources section included", passed: /^##\s+sources\s*$/im.test(input.content), blocking: true, weight: 5 },
    { key: "sources", label: "At least one secure primary source added", passed: sourceUrls.length > 0, blocking: true, weight: 5 },
    { key: "sources_cited", label: "Every listed source is a clickable citation", passed: sourceUrls.length > 0 && sourceUrls.every((url) => linkSet.has(url)), blocking: true, weight: 8 },
    { key: "inline_citation", label: "Official evidence is cited in context", passed: sourceUrls.some((url) => inlineLinkSet.has(url)), blocking: true, weight: 7 },
    { key: "external_links", label: "Every external link is an approved source", passed: externalLinks.every((url) => sourceUrls.includes(url)), blocking: true, weight: 6 },
    { key: "internal_links", label: "At least two useful internal links included", passed: new Set(internalLinks).size >= 2, blocking: true, weight: 6 },
    { key: "source_evidence", label: "Private notes map every source to supported facts", passed: sourceEvidenceCovered(sourceUrls, input.sourceNotes), blocking: true, weight: 7 },
    { key: "safe_markdown", label: "Article contains safe Markdown only", passed: markdownSafetyIssues(input.content).length === 0, blocking: true, weight: 8 },
    { key: "marketing_language", label: "No prohibited promises or marketing claims", passed: !PROHIBITED_MARKETING_LANGUAGE.test(input.content), blocking: true, weight: 5 },
    { key: "fact_check", label: "Human fact-check recorded", passed: Boolean(input.factCheckedAt), blocking: true, weight: 0 },
    {
      key: "legal_review",
      label: input.needsLegalReview ? "Legal-boundary review recorded" : "Legal review not required",
      passed: !input.needsLegalReview || Boolean(input.legalReviewedAt),
      blocking: true,
      weight: 0,
    },
  ]
  const automatedChecks = checks.filter((check) => !["fact_check", "legal_review"].includes(check.key))
  const totalWeight = automatedChecks.reduce((sum, check) => sum + check.weight, 0)
  const passedWeight = automatedChecks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0)
  const score = totalWeight ? Math.round((passedWeight / totalWeight) * 100) : 0
  const blockingReady = checks.filter((check) => check.blocking).every((check) => check.passed)
  return {
    checks,
    score,
    ready: blockingReady && score >= ARTICLE_QUALITY_MIN_SCORE,
  }
}

