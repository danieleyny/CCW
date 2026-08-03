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
// the standing disclaimer, and the trainer-onboarding quiz that teaches trainers
// not to use guarantee/insider/approval-rate language.
const ALLOW = new Set(["config/brand.ts", "content/trainer-onboarding.ts"])
const BANNED: [string, RegExp][] = [
  ["guarantee", /guarantee/i],
  ["expedite", /expedite/i],
  ["fast-track", /fast[- ]track/i],
  ["insider", /\binsider\b/i],
  ["approval rate", /approval rate/i],
  // NOTE: "we file" and "on your behalf" were BANNED under the old "the applicant
  // always files their own application" position. As of 2026-08-03 that reversed
  // for the Full Concierge tier (Gun License NYC files on the applicant's behalf,
  // counsel-cleared), so those phrases are now legitimate and no longer banned.
  // The load-bearing guard is now REPRESENTATION — we still never represent an
  // applicant — but that's enforced by copy + review, not a regex (every mention
  // is a negation like "we don't represent you", which a naive ban would misfire on).
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
      const text = readFileSync(f, "utf8")
      for (const [name, re] of BANNED) {
        if (re.test(text)) hits.push(`${rel}: "${name}"`)
      }
    }
    expect(hits, `Banned copy found — see AGENTS.md rule 4:\n${hits.join("\n")}`).toEqual([])
  })
})
