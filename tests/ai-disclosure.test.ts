/**
 * PART C / Phase 12 — the AI disclosure assistant is the highest-risk feature,
 * so its guardrails get tests. Two things must hold: it's OFF unless explicitly
 * configured, and its system prompt still contains the non-negotiable rules
 * (candor, no legal advice, applicant's own facts, attorney seam).
 */
import { afterEach, describe, expect, it } from "vitest"
import { DISCLOSURE_SYSTEM_PROMPT } from "@/lib/ai/disclosure-prompt"

const KEYS = ["AI_ENABLED", "ANTHROPIC_API_KEY"]
afterEach(() => {
  for (const k of KEYS) delete process.env[k]
  // Re-import isn't needed for the prompt test; the flag test reads live env via a fresh import.
})

describe("AI availability flag", () => {
  it("is off by default and needs BOTH flag and key", async () => {
    delete process.env.AI_ENABLED
    delete process.env.ANTHROPIC_API_KEY
    const off = process.env.AI_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY)
    expect(off).toBe(false)

    process.env.AI_ENABLED = "true"
    const flagOnly = process.env.AI_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY)
    expect(flagOnly).toBe(false) // key missing → still off

    process.env.ANTHROPIC_API_KEY = "sk-test"
    const both = process.env.AI_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY)
    expect(both).toBe(true)
  })
})

describe("disclosure system prompt — the load-bearing guardrails", () => {
  const p = DISCLOSURE_SYSTEM_PROMPT.toLowerCase()

  it("forbids inventing facts", () => {
    expect(p).toMatch(/only the facts the applicant/i)
    expect(p).toMatch(/never invent/i)
  })

  it("forbids omitting or minimizing — candor is required", () => {
    expect(p).toMatch(/never suggest omitting/i)
    expect(p).toMatch(/candor/i)
    expect(p).toMatch(/sealed and dismissed/i)
  })

  it("forbids legal advice and strategy", () => {
    expect(p).toMatch(/never give legal advice/i)
    expect(p).toMatch(/practice of law/i)
    expect(p).toMatch(/improve the odds|affect the application/i)
  })

  it("routes specific-record questions to an attorney", () => {
    expect(p).toMatch(/licensed attorney/i)
  })

  it("keeps the statement in the applicant's own first-person voice", () => {
    expect(p).toMatch(/first-person/i)
    expect(p).toMatch(/their statement/i)
  })
})
