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
const ALLOW = new Set(["config/brand.ts"])
const BANNED: [string, RegExp][] = [
  ["guarantee", /guarantee/i],
  ["expedite", /expedite/i],
  ["fast-track", /fast[- ]track/i],
  ["insider", /\binsider\b/i],
  ["approval rate", /approval rate/i],
  ["we file", /\bwe file\b/i],
  ["on your behalf", /on your behalf/i],
  ["endorsed by", /endorsed by/i],
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
