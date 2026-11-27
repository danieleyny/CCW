export type ArticleSectionKind = "body" | "role" | "sources"

export interface ArticleSection {
  id: string
  title: string
  markdown: string
  kind: ArticleSectionKind
}

export interface ArticleSource {
  title: string
  url: string
  host: string
}

export interface ParsedArticle {
  shortAnswer?: string
  shortAnswerLabel?: "The short answer" | "In brief"
  introMarkdown?: string
  sections: ArticleSection[]
  sources: ArticleSource[]
}

const SHORT_ANSWER_TITLE = /^(?:(?:the\s+)?(?:short|quick)\s+answer|in\s+(?:short|brief))$/i
const SOURCE_TITLE = /^(?:sources?|references)$/i
const ROLE_TITLE = /(?:your role|who submits|who files)/i
const SOURCE_LINK = /^\s*[-*+]\s+\[([^\]]+)]\((https?:\/\/[^\s)]+)\)\s*$/
const LEGACY_SOURCE_LINK = /^\s*[-*+]\s+(.+?):\s+(https?:\/\/\S+)\s*$/

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section"
}

function firstParagraph(markdown: string) {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(Boolean)
}

function sourceHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "") }
  catch { return url }
}

/** Convert normalized Markdown into the content blocks used by the editorial layout. */
export function parseArticle(markdown: string): ParsedArticle {
  const content = markdown.replace(/\r\n?/g, "\n").trim()
  const matches = [...content.matchAll(/^##\s+(.+)\s*$/gm)]
  const introMarkdown = matches.length ? content.slice(0, matches[0].index).trim() : content
  const seenIds = new Map<string, number>()
  const sections: ArticleSection[] = []
  const sources: ArticleSource[] = []
  let shortAnswer: string | undefined
  let shortAnswerLabel: ParsedArticle["shortAnswerLabel"]

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const title = match[1].trim()
    const bodyStart = (match.index ?? 0) + match[0].length
    const bodyEnd = matches[index + 1]?.index ?? content.length
    let body = content.slice(bodyStart, bodyEnd).trim()

    if (!shortAnswer && SHORT_ANSWER_TITLE.test(title)) {
      shortAnswer = firstParagraph(body)
      shortAnswerLabel = /^in\s+/i.test(title) ? "In brief" : "The short answer"
      continue
    }

    let kind: ArticleSectionKind = "body"
    if (ROLE_TITLE.test(title)) kind = "role"
    if (SOURCE_TITLE.test(title)) {
      kind = "sources"
      const remaining: string[] = []
      for (const line of body.split("\n")) {
        const source = line.match(SOURCE_LINK) ?? line.match(LEGACY_SOURCE_LINK)
        if (!source) {
          remaining.push(line)
          continue
        }
        sources.push({ title: source[1].trim(), url: source[2], host: sourceHost(source[2]) })
      }
      body = remaining.join("\n").replace(/\n{3,}/g, "\n\n").trim()
    }

    const baseId = slugifyHeading(title)
    const count = (seenIds.get(baseId) ?? 0) + 1
    seenIds.set(baseId, count)
    sections.push({
      id: count === 1 ? baseId : `${baseId}-${count}`,
      title,
      markdown: body,
      kind,
    })
  }

  return {
    shortAnswer,
    shortAnswerLabel,
    introMarkdown: introMarkdown || undefined,
    sections,
    sources,
  }
}
