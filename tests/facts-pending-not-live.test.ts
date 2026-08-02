/**
 * Safety rail for the legal guardrail: content/facts-pending.ts holds DRAFT legal
 * claims awaiting attorney review. They must never render on a client-facing page
 * before sign-off. This fails if anything under app/ or components/ imports the
 * pending module — so a draft physically cannot go live by accident. On approval,
 * an entry is MOVED into content/facts.ts (which pages may import), not linked
 * from here.
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

describe("pending legal facts never render live", () => {
  it("no file under app/ or components/ imports content/facts-pending", () => {
    const files = [...walk("app"), ...walk("components")]
    const offenders = files.filter((f) => /facts-pending/.test(readFileSync(f, "utf8")))
    expect(offenders, `these render a draft legal fact before sign-off:\n${offenders.join("\n")}`).toEqual([])
  })
})
