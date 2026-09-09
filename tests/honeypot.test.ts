/**
 * The honeypot must never collide with browser autofill.
 *
 * Regression: the field was named "company", which browser address-autofill and
 * password managers fill from the visitor's saved profile — silently flagging REAL
 * people as bots (they saw a success screen; nothing was sent). The field name must
 * match NO common autofill token, and every public form + its server action must read
 * the SAME shared name (drift is what reintroduced the silent-drop).
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { HONEYPOT_FIELD, honeypotTripped } from "@/lib/honeypot"

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8")

// Names a browser/password-manager will autofill — the honeypot must be none of these.
const AUTOFILL_TOKENS = [
  "company",
  "organization",
  "name",
  "fname",
  "lname",
  "email",
  "phone",
  "tel",
  "address",
  "street",
  "city",
  "state",
  "zip",
  "postal",
  "country",
  "url",
  "website",
  "username",
  "password",
]

describe("honeypot field name", () => {
  it("does not match a common autofill token", () => {
    expect(AUTOFILL_TOKENS).not.toContain(HONEYPOT_FIELD.toLowerCase())
  })

  it("honeypotTripped is true only when filled", () => {
    const fd = new FormData()
    expect(honeypotTripped(fd)).toBe(false)
    fd.set(HONEYPOT_FIELD, "   ")
    expect(honeypotTripped(fd)).toBe(false) // whitespace-only is empty
    fd.set(HONEYPOT_FIELD, "bot value")
    expect(honeypotTripped(fd)).toBe(true)
  })

  it("no public form still ships the autofill-prone 'company' honeypot", () => {
    for (const rel of [
      "components/marketing/consultation-form.tsx",
      "components/marketing/lead-form.tsx",
      "app/auth/sign-up/page.tsx",
    ]) {
      expect(read(rel), `${rel} still has a name="company" honeypot`).not.toContain('name="company"')
    }
  })

  it("every server action reads the shared honeypot, not a literal 'company'", () => {
    for (const rel of [
      "app/(marketing)/consultation-actions.ts",
      "app/(marketing)/actions.ts",
      "app/auth/actions.ts",
    ]) {
      const src = read(rel)
      expect(src, `${rel} should use honeypotTripped`).toContain("honeypotTripped")
      expect(src, `${rel} still reads get("company")`).not.toContain('get("company")')
    }
  })
})
