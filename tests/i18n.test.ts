/**
 * PART C / Phase 11 — the i18n framework's integrity, especially the legal-copy
 * guardrail: no locale may silently override a legal-bearing string with an
 * un-reviewed translation.
 */
import { describe, expect, it } from "vitest"
import { LOCALES } from "@/config/i18n"
import { CATALOGS, SOURCE, LEGAL_KEYS } from "@/lib/i18n/messages"

// Flatten a (possibly partial) catalog to dotted keys it actually defines.
function keysOf(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v && typeof v === "object" ? keysOf(v, path) : [path]
  })
}

describe("i18n catalogs", () => {
  it("English is the complete source of keys", () => {
    expect(keysOf(SOURCE).length).toBeGreaterThan(0)
  })

  it("every declared locale has a catalog", () => {
    for (const l of LOCALES) expect(CATALOGS[l.key]).toBeDefined()
  })

  it("no locale defines a key the English source doesn't have", () => {
    const source = new Set(keysOf(SOURCE))
    for (const l of LOCALES) {
      for (const key of keysOf(CATALOGS[l.key] as object)) {
        expect(source.has(key), `${l.key} has stray key ${key}`).toBe(true)
      }
    }
  })

  it("NO non-English locale translates a legal-bearing key (⚖ attorney review required)", () => {
    // Legal keys must fall back to reviewed English until counsel signs off.
    for (const l of LOCALES) {
      if (l.key === "en") continue
      const defined = new Set(keysOf(CATALOGS[l.key] as object))
      for (const legalKey of LEGAL_KEYS) {
        expect(defined.has(legalKey), `${l.key} must not translate ${legalKey} without review`).toBe(false)
      }
    }
  })
})
