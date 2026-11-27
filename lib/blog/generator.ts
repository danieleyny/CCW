import "server-only"

import { generateText } from "ai"
import {
  GENERATED_ARTICLE_MIN_WORDS,
  generatedDraftIssues,
  unsupportedNumericClaims,
} from "@/lib/blog/validation"
import { normalizeArticleMarkdown } from "@/lib/blog/normalize"
import { CANONICAL_ORIGIN } from "@/lib/seo"

export const BLOG_AI_ENABLED = process.env.BLOG_AI_ENABLED !== "false"

// Default to a current AI Gateway free-tier model so supervised drafting works
// before the project enables paid Gateway credits. Article inputs contain only
// editorial research, never applicant case data.
const BLOG_MODEL = process.env.AI_GATEWAY_MODEL?.trim() || "nvidia/nemotron-3.5-lightning-free"

const INTERNAL_LINKS = [
  `${CANONICAL_ORIGIN}/requirements`,
  `${CANONICAL_ORIGIN}/premises-vs-carry`,
  `${CANONICAL_ORIGIN}/timeline`,
  `${CANONICAL_ORIGIN}/fees`,
  `${CANONICAL_ORIGIN}/faq`,
  `${CANONICAL_ORIGIN}/checklist`,
  `${CANONICAL_ORIGIN}/eligibility`,
  `${CANONICAL_ORIGIN}/how-it-works`,
]

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
- Start with an exact level-two heading, ## The short answer, followed by one 2–3 sentence paragraph that directly answers the title question using only the supplied evidence. Do not repeat the article title in the body.
- Use at least three real level-two Markdown headings written exactly as ## Heading. Never use a level-one # heading or bold text as a heading.
- Write every section title as ## Title on its own line. Never write a bold line as a heading.
- For document or item lists, use - **Item** — short description.
- For steps, use 1. **Step** — short description.
- Put callouts in > **Label:** text.
- Under ## Sources, write one supplied source per line as - [Exact page title](https://url).
- If the article explains who submits the application, include ## Your role in the application and state accurately that the applicant submits their own application.
- Cite official evidence in context with clickable Markdown links, and include every supplied source again as a clickable link under an exact ## Sources heading.
- Add two or three genuinely useful internal links chosen only from the supplied internal-link list.
- Link only the supplied source URLs and internal-link URLs. Do not add another URL.
- End with a concise reminder to confirm current requirements with the NYPD and seek a New York-licensed attorney for case-specific legal advice.`

export async function generateArticleDraft(input: ArticleGenerationInput) {
  if (!BLOG_AI_ENABLED) {
    return { content: createGuidedStarter(input), usedAi: false as const }
  }
  if (!input.sourceUrls.length) {
    throw new Error("Add at least one primary official source before generating the article.")
  }
  if ((input.sourceNotes?.trim().length ?? 0) < 80) {
    throw new Error("Add source notes explaining what the official sources establish before generating the article.")
  }

  const basePrompt = [
    `Working title: ${input.title}`,
    `Article type: ${input.kind}`,
    `Target search question: ${input.targetQuery || "Not provided"}`,
    `Editorial brief:\n${input.brief || "Not provided"}`,
    `Editor-provided source notes:\n${input.sourceNotes || "No additional source notes were provided. Use only supported, non-case-specific statements and omit unsupported points."}`,
    `Allowed source URLs:\n${input.sourceUrls.join("\n") || "None supplied"}`,
    `Allowed internal links (choose two or three):\n${INTERNAL_LINKS.join("\n")}`,
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

    const stripped = result.text
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
    const content = normalizeArticleMarkdown(stripped, { title: input.title })
    const issues = content
      ? generatedDraftIssues(content, {
          title: input.title,
          sourceUrls: input.sourceUrls,
          requireInternalLinks: true,
        })
      : ["The generator returned an empty draft."]
    const unsupportedNumbers = content
      ? unsupportedNumericClaims(content, [input.title, input.targetQuery, input.brief, input.sourceNotes].filter(Boolean).join("\n"))
      : []
    if (unsupportedNumbers.length) {
      issues.push(`The generated article introduced unsupported numeric claims: ${unsupportedNumbers.join(", ")}.`)
    }
    if (!issues.length) return { content, usedAi: true as const }
    previousDraft = content
    previousIssues = issues
  }

  throw new Error(
    `The generator could not create a complete ${GENERATED_ARTICLE_MIN_WORDS}-word article without placeholders. `
      + "Check that the research notes contain enough verified source material, then try again."
  )
}

