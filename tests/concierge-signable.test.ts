/**
 * The two layers that used to disagree, pinned together: Review & file must never
 * offer a Sign button that signRequirementDocument then refuses ("That requirement
 * isn't signed here."). The server accepts a signature iff isSignable(action), so
 * conciergeSignable — what drives the Sign button — must imply it, and a wet-ink
 * document (signed on paper before a notary/witness) must never be offered Sign.
 */
import { describe, expect, it } from "vitest"
import { REQUIREMENT_ACTIONS, actionFor, isSignable, actionWetInk } from "@/lib/requirements/actions"
import { conciergeSignable } from "@/lib/concierge/review"

describe("Review & file signability agrees with the server", () => {
  const codes = Object.keys(REQUIREMENT_ACTIONS)

  it("every requirement that offers Sign is one the server will sign", () => {
    for (const reqCode of codes) {
      if (conciergeSignable(reqCode)) {
        expect(isSignable(actionFor(reqCode)), `${reqCode}: UI offers Sign but the server refuses it`).toBe(true)
      }
    }
  })

  it("a wet-ink (notary/witness) document is never offered Sign", () => {
    for (const reqCode of codes) {
      const a = actionFor(reqCode)
      if (a && actionWetInk(a)) {
        expect(conciergeSignable(reqCode), `${reqCode}: wet-ink document must not offer Sign`).toBe(false)
      }
    }
  })
})
