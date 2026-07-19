"use server"

import { requireRole } from "@/lib/auth"
import { isRonLive, getRonProvider, ronUnavailableReason } from "@/lib/notarization/ron"

export type RonStartResult = { ok?: boolean; redirectUrl?: string; unavailable?: string; error?: string }

/**
 * PART B / Phase 5 — begin online notarization for a prepared document.
 *
 * FAILS CLOSED. Unless a counsel-confirmed provider is live (it isn't today),
 * this returns the offline-path guidance and does nothing. It can never mark a
 * document notarized on its own — only a real, sealed provider result does that.
 */
export async function startRonNotarization(documentRef: string): Promise<RonStartResult> {
  await requireRole(["client"])

  if (!isRonLive()) {
    return { unavailable: ronUnavailableReason() }
  }
  if (!documentRef) return { error: "No document specified." }

  const provider = getRonProvider()
  if (!provider) {
    // Belt and suspenders: live status with no adapter must still fail closed.
    return { unavailable: ronUnavailableReason() }
  }

  // When a provider is wired, start the session and hand off. Marking the
  // requirement satisfied happens ONLY in the result webhook, on real evidence.
  return { error: "Online notarization provider adapter is not implemented." }
}
