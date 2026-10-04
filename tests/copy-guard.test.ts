/**
 * V5b Workstream E.1 — the copy guard as a TEST, not a habit. Walks every
 * .tsx/.ts/.mdx under app/, components/, content/, config/ and fails on any
 * banned marketing word (AGENTS.md rule 4). Exactly one file is allowlisted:
 * config/brand.ts, whose disclaimer legitimately uses the words to NEGATE them.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

const ROOTS = ["app", "components", "content", "config"]
const EXT = /\.(tsx?|mdx)$/
// Allowlisted files legitimately NAME the banned words in order to forbid them:
// the standing disclaimer, the trainer-onboarding quiz that teaches trainers
// not to use guarantee/insider/approval-rate language, and the concierge
// engagement agreements, which DISCLAIM outcomes ("makes no guarantee", "no
// consultant can expedite the NYPD's review") — the same negating use as the
// disclaimer.
const ALLOW = new Set([
  "config/brand.ts",
  "content/trainer-onboarding.ts",
  "config/agreements.ts",
])
// NARROW per-file phrase exemptions — the file is still scanned, but these exact strings
// are stripped first, so any OTHER banned word in the same file still fails. Used for
// legitimate proper nouns / negating disclaimers, never to wave a file through.
const PHRASE_ALLOW: Record<string, RegExp[]> = {
  // Partner config: the AAA's proper-noun panel name (no claim about NYPD speed), and an
  // attorney's advertising disclaimer that NEGATES a guarantee (same use as brand.ts).
  "config/partners.ts": [/Expedited Panels?/g, /Prior results do not guarantee a similar outcome\./g],
}
const BANNED: [string, RegExp][] = [
  ["guarantee", /guarantee/i],
  ["expedite", /expedite/i],
  ["fast-track", /fast[- ]track/i],
  ["insider", /\binsider\b/i],
  ["approval rate", /approval rate/i],
  // Applicant-controlled filing is checked separately below with targeted positive-
  // claim patterns, so negations such as "we do not file" remain legal copy.
  ["endorsed by", /endorsed by/i],

  // ── Implied-outcome claims (added during the retail-voice copy pass) ──
  // The list above is all WORDS. Warming the voice introduced a different
  // failure mode: sentences that promise the applicant's OUTCOME while using
  // none of the banned words — "how we get you licensed", "we'll get your
  // license". Those trip nothing above, which is exactly what makes them
  // dangerous: we cannot deliver the outcome, only the readiness to file.
  // Say "get you ready to file" instead.
  ["get you licensed", /\bget(s|ting)? you (a )?licens(ed|e)\b/i],
  ["get your license", /\bget(s|ting)? your licens[ce]\b/i],
  ["get you approved", /\bget(s|ting)? you approved\b/i],
]

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name !== "node_modules") walk(join(dir, e.name), acc)
    } else if (EXT.test(e.name)) {
      acc.push(join(dir, e.name))
    }
  }
  return acc
}

describe("copy guard — AGENTS.md rule 4 (banned marketing words)", () => {
  it("no banned words outside the allowlisted disclaimer", () => {
    const root = process.cwd()
    const files = ROOTS.flatMap((r) => walk(join(root, r)))
    const hits: string[] = []
    for (const f of files) {
      const rel = relative(root, f)
      if (ALLOW.has(rel)) continue
      let text = readFileSync(f, "utf8")
      for (const re of PHRASE_ALLOW[rel] ?? []) text = text.replace(re, "")
      for (const [name, re] of BANNED) {
        if (re.test(text)) hits.push(`${rel}: "${name}"`)
      }
    }
    expect(hits, `Banned copy found — see AGENTS.md rule 4:\n${hits.join("\n")}`).toEqual([])
  })

  it("never promises that the consultant enters, files, or submits an NYPD application", () => {
    const root = process.cwd()
    const files = [...ROOTS, "lib"].flatMap((dir) => walk(join(root, dir)))
    const positiveFilingClaims = [
      /\bwe file it for you\b/i,
      /\bGun License NYC files it for you\b/i,
      /\bwe file it with the NYPD\b/i,
      /\bfiles? (?:it|your application) on (?:your|the applicant's) behalf\b/i,
      /\bfile and submit my NYPD\b/i,
      /\bwe may enter and file\b/i,
      /\bwe file your application\b/i,
      /\bcan file it for you\b/i,
      /\bwe\) still file the paperwork\b/i,
    ]
    const hits: string[] = []
    for (const path of files) {
      const text = readFileSync(path, "utf8")
      for (const pattern of positiveFilingClaims) if (pattern.test(text)) hits.push(`${relative(root, path)}: ${pattern}`)
    }
    expect(hits, `Consultant-filing promise found:\n${hits.join("\n")}`).toEqual([])
  })
})
