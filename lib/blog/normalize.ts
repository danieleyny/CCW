const BOLD_ONLY_LINE = /^(?:\*\*([^*\n]+)\*\*|__([^_\n]+)__)(?::)?\s*$/

function comparableHeading(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
}

function boldHeadingText(lines: string[], index: number) {
  const line = lines[index]?.trim() ?? ""
  const match = line.match(BOLD_ONLY_LINE)
  if (!match) return null
  if (index > 0 && lines[index - 1]?.trim()) return null

  const text = (match[1] ?? match[2] ?? "").trim().replace(/:\s*$/, "")
  if (text.length < 2 || text.length > 90) return null
  if (/[.!]$/.test(text)) return null
  if (/\?$/.test(text) && text.length >= 90) return null
  return text
}

/** Bold-only paragraph lines that the article normalizer promotes to H2s. */
export function boldHeadingLines(content: string) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n")
  return lines.flatMap((_, index) => {
    const text = boldHeadingText(lines, index)
    return text ? [text] : []
  })
}

/**
 * Repairs common model/editor Markdown mistakes without changing article prose.
 * This function is deliberately pure so the public renderer, editor and
 * generator can share the exact same behavior.
 */
export function normalizeArticleMarkdown(
  markdown: string,
  { title }: { title: string }
) {
  let content = markdown.replace(/\r\n?/g, "\n").trim()
  const fenced = content.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i)
  if (fenced) content = fenced[1].trim()
  else content = content.replace(/^```(?:markdown|md)?\s*\n/i, "")

  const lines = content.split("\n")
  const pageTitle = comparableHeading(title)
  const legacyLead = comparableHeading(lines[0] ?? "")
  if (
    legacyLead && pageTitle &&
    (legacyLead.includes(pageTitle) || pageTitle.includes(legacyLead)) &&
    !lines[1]?.trim() && /^(?:\*{3,}|-{3,}|_{3,})$/.test(lines[2]?.trim() ?? "")
  ) {
    lines.splice(0, 3)
    while (!lines[0]?.trim()) lines.shift()
  }
  const normalized = lines.flatMap((rawLine, index) => {
    const line = rawLine.replace(/^##(?![#\s])/, "## ")
    const h1 = line.match(/^#\s+(.+)$/)
    if (h1 && comparableHeading(h1[1]) === pageTitle) return []

    const promoted = boldHeadingText(lines, index)
    return [promoted ? `## ${promoted}` : line]
  })

  return normalized.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}
