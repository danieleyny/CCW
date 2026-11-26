import "server-only"

import { generateText } from "ai"
import {
  GENERATED_ARTICLE_MIN_WORDS,
  generatedDraftIssues,
} from "@/lib/blog/validation"

export const BLOG_AI_ENABLED = process.env.BLOG_AI_ENABLED !== "false"

const BLOG_MODEL = process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-5.4-mini"

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
- Never invent a fact, quotation, citation, law, fee, timeline, statistic or government requirement.
- Return a complete final draft. Never include TODO, TBD, bracketed instructions, editorial prompts, missing-section notes or requests for the editor to finish the writing.
- If the supplied evidence does not support a point, omit that point or narrow the article. Do not expose the missing research as a placeholder in the article.
- Never copy or closely paraphrase a news report. Add original, practical NYC application context.
- Never provide legal advice, tactical firearm advice, outcome predictions, or advice to omit/minimize a disclosure.
- Never say the service represents applicants, submits for them, expedites, guarantees or is endorsed by the NYPD.
- State accurately when relevant: the applicant controls the NYPD portal account and submits their own application.
- Use a calm, precise professional voice. Write 900–1,300 words, never fewer than ${GENERATED_ARTICLE_MIN_WORDS}, with descriptive headings, short paragraphs, useful bullets and a Sources section.
- Link only the source URLs supplied by the editor. Do not add another URL.
- End with a concise reminder to confirm current requirements with the NYPD and seek a New York-licensed attorney for case-specific legal advice.`

export async function generateArticleDraft(input: ArticleGenerationInput) {
  if (!BLOG_AI_ENABLED) {
    return { content: createGuidedStarter(input), usedAi: false as const }
  }

  const basePrompt = [
    `Working title: ${input.title}`,
    `Article type: ${input.kind}`,
    `Target search question: ${input.targetQuery || "Not provided"}`,
    `Editorial brief:\n${input.brief || "Not provided"}`,
    `Editor-provided source notes:\n${input.sourceNotes || "No additional source notes were provided. Use only supported, non-case-specific statements and omit unsupported points."}`,
    `Allowed source URLs:\n${input.sourceUrls.join("\n") || "None supplied"}`,
  ].join("\n\n")

  let previousDraft = ""
  let previousIssues: string[] = []
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const repairContext = attempt === 0
      ? ""
      : [
          "The prior attempt was rejected by automatic quality checks.",
          `Problems to correct:\n${previousIssues.map((issue) => `- ${issue}`).join("\n")}`,
          "Rewrite the entire article as a complete final draft. Expand useful supported explanation, remove every placeholder, and keep every factual claim within the supplied evidence.",
          `Rejected draft:\n${previousDraft}`,
        ].join("\n\n")
    const result = await generateText({
      model: BLOG_MODEL,
      maxOutputTokens: 5000,
      temperature: 0,
      instructions: SYSTEM_PROMPT,
      prompt: [basePrompt, repairContext].filter(Boolean).join("\n\n"),
    })

    const content = result.text
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
    const issues = content ? generatedDraftIssues(content) : ["The generator returned an empty draft."]
    if (!issues.length) return { content, usedAi: true as const }
    previousDraft = content
    previousIssues = issues
  }

  throw new Error(
    `The generator could not create a complete ${GENERATED_ARTICLE_MIN_WORDS}-word article without placeholders. `
      + "Check that the research notes contain enough verified source material, then try again."
  )
}

