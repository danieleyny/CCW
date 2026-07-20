import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { AI_ENABLED, AI_MODEL } from "@/lib/ai"
import { DISCLOSURE_SYSTEM_PROMPT } from "@/lib/ai/disclosure-prompt"

/**
 * PART C / Phase 12 — the guardrailed disclosure-narrative assistant.
 *
 * ⚖ HIGHEST LEGAL-RISK FEATURE. Built correctly it removes the single most
 * painful step for applicants (writing a clear factual account of an arrest);
 * built loosely it is the unauthorized practice of law. The line it must never
 * cross: it ORGANIZES the applicant's OWN stated facts into a clear, complete,
 * candor-maximizing narrative. It does not advise, strategize, or predict.
 *
 * The guardrails live in three places, all load-bearing:
 *   1. The flag — off by default; this function throws if called when disabled.
 *   2. The system prompt below — the hard rules the model operates under.
 *   3. The caller — the draft is the APPLICANT'S statement, which they edit and
 *      own; it is flagged for mandatory human (staff/attorney) review before
 *      use, and disclosures are never trainer-visible.
 *
 * The applicant's facts are the ONLY source. Nothing is invented; if a fact is
 * missing the draft leaves a clearly-marked blank rather than filling it in.
 */

/** The applicant's own stated facts about one disclosure — the only input. */
export interface DisclosureFacts {
  kind: "arrest" | "summons" | "order_of_protection" | "domestic_incident" | "other"
  occurredOn?: string
  jurisdiction?: string
  charge?: string
  disposition?: string
  /** The applicant's own account, in their words. */
  whatHappened: string
  outcome?: string
}

export interface DraftResult {
  draft: string
  /** Always true — every AI-assisted draft requires human review before use. */
  needsLegalReview: true
}

export async function draftDisclosureNarrative(facts: DisclosureFacts): Promise<DraftResult> {
  if (!AI_ENABLED) {
    // Fail closed. The feature is off; the applicant writes their own narrative.
    throw new Error("The writing assistant isn't available. Please write your statement in your own words.")
  }

  const client = new Anthropic()
  const userFacts = [
    `Type of item: ${facts.kind.replace(/_/g, " ")}`,
    facts.occurredOn && `Date: ${facts.occurredOn}`,
    facts.jurisdiction && `Court / jurisdiction: ${facts.jurisdiction}`,
    facts.charge && `Charge or reason: ${facts.charge}`,
    facts.disposition && `Disposition: ${facts.disposition}`,
    facts.outcome && `Outcome / resolution: ${facts.outcome}`,
    "",
    "In the applicant's own words, what happened:",
    facts.whatHappened,
  ]
    .filter(Boolean)
    .join("\n")

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: DISCLOSURE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Organize these facts into a clear first-person written statement:\n\n${userFacts}`,
      },
    ],
  })

  const draft = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()

  return { draft, needsLegalReview: true }
}
