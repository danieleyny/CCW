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

export interface PublicationInput {
  title: string
  slug: string
  description: string
  content: string
  sourceUrls: string[]
  factCheckedAt?: string | null
  needsLegalReview: boolean
  legalReviewedAt?: string | null
}

export function publicationReadiness(input: PublicationInput) {
  const checks = [
    { key: "title", label: "Specific title added", passed: input.title.trim().length >= 5 },
    { key: "slug", label: "Clean article URL", passed: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) },
    {
      key: "description",
      label: "Search description is 50–180 characters",
      passed: input.description.trim().length >= 50 && input.description.trim().length <= 180,
    },
    { key: "body", label: "Article has at least 500 words", passed: articleWordCount(input.content) >= 500 },
    { key: "sources", label: "At least one secure source is linked", passed: input.sourceUrls.length > 0 },
    { key: "safe_markdown", label: "Article contains safe Markdown only", passed: markdownSafetyIssues(input.content).length === 0 },
    { key: "fact_check", label: "Human fact-check recorded", passed: Boolean(input.factCheckedAt) },
    {
      key: "legal_review",
      label: input.needsLegalReview ? "Legal-boundary review recorded" : "Legal review not required",
      passed: !input.needsLegalReview || Boolean(input.legalReviewedAt),
    },
  ]
  return { checks, ready: checks.every((check) => check.passed) }
}

