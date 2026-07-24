/**
 * Keeps the serial "db" project honest: every test that imports the shared
 * Supabase helper MUST be listed in tests/db-suites.ts, or it would run in the
 * parallel "unit" project and reintroduce the shared-DB flakiness we fixed.
 *
 * Pure filesystem check — no DB — so it lives in the unit project itself.
 */
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { DB_TEST_FILES } from "./db-suites"

const testsDir = path.resolve(__dirname)

/** Every *.test.ts under tests/, as repo-relative "tests/..." paths. */
function allTestFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...allTestFiles(full))
    else if (entry.name.endsWith(".test.ts")) {
      out.push(path.relative(path.resolve(testsDir, ".."), full))
    }
  }
  return out
}

describe("db-suites list", () => {
  it("lists exactly the test files that touch the shared database", () => {
    const touchesDb = allTestFiles(testsDir)
      .filter((rel) => /helpers\/supabase/.test(readFileSync(path.resolve(testsDir, "..", rel), "utf8")))
      .sort()
    // Same set — a new DB test added to tests/ must be added to db-suites.ts,
    // and a listed file that stops touching the DB should be removed.
    expect([...DB_TEST_FILES].sort()).toEqual(touchesDb)
  })
})
