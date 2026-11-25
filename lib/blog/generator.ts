import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { AI_MODEL } from "@/lib/ai"
import { markdownSafetyIssues } from "@/lib/blog/validation"

export const BLOG_AI_ENABLED = process.env.BLOG_AI_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY)

export interface ArticleGenerationInput {
  title: string
  kind: string
  targetQuery?: string | null
  brief?: string | null
  sourceUrls: string[]
  sourceNotes?: string | null
}

function sourceList(urls: string[]) {
  return urls.length
    ? urls.map((url, index) => `- [Source ${index + 1}](${url})`).join("\n")
    : "- TODO: Add at least one primary government source before review."
}

export function createGuidedStarter(input: ArticleGenerationInput) {
  const readerQuestion = input.targetQuery?.trim() || input.title
  const brief = input.brief?.trim() || "Explain the answer clearly, accurately and in the order an NYC applicant needs it."
  return `> **EDITORIAL DRAFT — not legal advice.** Verify every factual statement against the linked primary sources before publication.

## The short answer

Draft a direct, plain-English answer to: **${readerQuestion}**

Use two or three sentences. Do not promise an outcome, predict an NYPD decision, or advise a reader about a case-specific legal issue.

## What this means for an NYC applicant

${brief}

Explain the practical process without suggesting that Gun License NYC represents the applicant, controls the NYPD portal, or can affect government timing. The applicant always controls and submits their own application.

## What the published rules say

Summarize only what the primary authorities below actually establish. Add an inline link immediately after each rule or requirement. If the sources do not answer a point, write **TODO: verify** instead of filling the gap.

## What to prepare

- TODO: List the records or information an applicant should organize.
- TODO: Separate official requirements from optional preparation tips.
- TODO: Identify anything that may require guidance from a New York-licensed attorney.

## Common questions

### What should I do first?

TODO: Give one accurate, low-risk first step supported by a source.

### What if my situation is unusual?

Explain that case-specific legal judgment belongs with a New York-licensed attorney. Do not recommend omitting, minimizing or reframing any required disclosure.

## Sources

${sourceList(input.sourceUrls)}

## Final review notes

- Confirm that every legal or licensing statement has a primary source.
- Remove every TODO before submitting the article for review.
- Confirm the article is original and does not copy a report's wording, structure or images.
- Add useful internal links to relevant Gun License NYC pages without keyword stuffing.
`
}

const SYSTEM_PROMPT = `You draft original educational articles for Gun License NYC, a private NYC gun-license document-preparation and case-management service.

Hard rules:
- Return ordinary Markdown only. Never use HTML, JSX, MDX expressions, imports, images or code fences.
- Use only the facts supplied in the editorial brief and source notes. A URL alone is not evidence of what its page says.
- Never invent a fact, quotation, citation, law, fee, timeline, statistic or government requirement. Mark missing support as "TODO: verify".
- Never copy or closely paraphrase a news report. Add original, practical NYC application context.
- Never provide legal advice, tactical firearm advice, outcome predictions, or advice to omit/minimize a disclosure.
- Never say the service represents applicants, submits for them, expedites, guarantees or is endorsed by the NYPD.
- State accurately when relevant: the applicant controls the NYPD portal account and submits their own application.
- Use a calm, precise professional voice. Aim for 900–1,300 words with descriptive headings, short paragraphs, useful bullets and a Sources section.
- Link only the source URLs supplied by the editor. Do not add another URL.
- End with a concise reminder to confirm current requirements with the NYPD and seek a New York-licensed attorney for case-specific legal advice.`

export async function generateArticleDraft(input: ArticleGenerationInput) {
  if (!BLOG_AI_ENABLED) {
    return { content: createGuidedStarter(input), usedAi: false as const }
  }

  const client = new Anthropic()
  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4500,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        `Working title: ${input.title}`,
        `Article type: ${input.kind}`,
        `Target search question: ${input.targetQuery || "Not provided"}`,
        `Editorial brief:\n${input.brief || "Not provided"}`,
        `Editor-provided source notes:\n${input.sourceNotes || "No source notes provided. Use TODO: verify for unsupported claims."}`,
        `Allowed source URLs:\n${input.sourceUrls.join("\n") || "None supplied"}`,
      ].join("\n\n"),
    }],
  })

  const content = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
  const issues = markdownSafetyIssues(content)
  if (!content || issues.length) throw new Error(issues[0] || "The generator returned an empty draft.")
  return { content, usedAi: true as const }
}

