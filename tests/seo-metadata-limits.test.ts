/**
 * SEO V2 — title/description length lint. Google truncates titles past ~60 chars
 * and descriptions past ~155. Every marketing page builds metadata through
 * `buildMetadata({ title, description })`, and the root template appends
 * " · Gun License NYC" (18 chars) to the title. This walks the page sources,
 * extracts the static title/description literals, and fails if the rendered
 * title (base + suffix) exceeds 60 or the description exceeds 155.
 *
 * Pages whose title/description are built dynamically (template literals) are
 * skipped here — their inputs are short by construction (blog frontmatter is
 * length-checked at authoring; fee-interpolated descriptions stay well under).
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const TITLE_SUFFIX = " · Gun License NYC"
const TITLE_MAX = 60
const DESC_MAX = 155

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full))
    else if (name === "page.tsx") out.push(full)
  }
  return out
}

/** Extract the first double-quoted string literal following `key:`. */
function literalFor(src: string, key: string): string | null {
  // Matches:  key: "value"   (single-line double-quoted; ignores template literals)
  const m = src.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  return m ? m[1].replace(/\\"/g, '"') : null
}

describe("SEO metadata length limits", () => {
  const pages = walk("app/(marketing)").filter((f) => readFileSync(f, "utf8").includes("buildMetadata("))

  it("finds marketing pages to check", () => {
    expect(pages.length).toBeGreaterThan(10)
  })

  for (const file of pages) {
    const src = readFileSync(file, "utf8")
    const rel = file.replace(/^app\//, "")
    const title = literalFor(src, "title")
    const description = literalFor(src, "description")

    it(`${rel}: title ≤ ${TITLE_MAX} chars incl. suffix`, () => {
      if (title === null) return // dynamic title — skipped
      const full = title + TITLE_SUFFIX
      expect(full.length, `"${full}" is ${full.length} chars`).toBeLessThanOrEqual(TITLE_MAX)
    })

    it(`${rel}: description ≤ ${DESC_MAX} chars`, () => {
      if (description === null) return // dynamic description — skipped
      expect(description.length, `"${description.slice(0, 60)}…" is ${description.length} chars`).toBeLessThanOrEqual(DESC_MAX)
    })
  }
})
