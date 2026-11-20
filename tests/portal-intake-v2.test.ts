import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const wizard = readFileSync("components/portal/intake/intake-wizard.tsx", "utf8")
const messages = readFileSync("lib/i18n/messages.ts", "utf8")

describe("V2 portal intake", () => {
  it("keeps the approved six-step flow as the source of step order", () => {
    expect(wizard).toContain("INTAKE_STEPS.map")
    expect(wizard).toContain("if (n <= step) setStep(n)")
    expect(wizard).not.toContain("setStep(n) // forward")
  })

  it("keeps the candor instruction exact", () => {
    expect(wizard).toContain(
      "Disclose every matter, even sealed or dismissed. An item we didn&apos;t disclose that turns up in the background check is far more damaging than the event itself."
    )
  })

  it("provides the focused disclosure mode without introducing a second answer store", () => {
    expect(wizard).toContain("focusedMode")
    expect(wizard).toContain("FocusedDisclosureQuestion")
    expect(wizard).toContain("onAnswer={setQ}")
    expect(wizard).toContain("onNarrative={setQNarrative}")
  })

  it("includes English and Spanish presentation copy", () => {
    expect(messages).toContain('eyebrow: "Application intake · Step {current} of {total}"')
    expect(messages).toContain('eyebrow: "Cuestionario de solicitud · Paso {current} de {total}"')
    expect(messages).toContain('answerOne: "Answer one at a time"')
    expect(messages).toContain('answerOne: "Responder una por una"')
  })
})
