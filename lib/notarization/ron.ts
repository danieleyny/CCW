/**
 * PART B / Phase 5 — Remote Online Notarization (RON) seam. ⚖ OFF BY DEFAULT.
 *
 * ── The legal gate (this is counsel's call, not code's) ─────────────────────
 * New York permits electronic and remote notarization under specific rules
 * (Executive Law §135-c and the associated regulations). Whether a particular
 * RON vendor's flow is VALID for THESE documents — the notarized cohabitant
 * affidavit and character-reference letters an NYPD handgun application requires
 * — is a legal determination we must not make in code. Until a New York
 * attorney confirms a specific provider meets the rules for these document
 * types, this stays disabled and the offline path is the only one offered.
 *
 * ── The guardrail ───────────────────────────────────────────────────────────
 * We NEVER mark a document notarized unless a valid NY notarization actually
 * occurred and we hold the provider's sealed evidence. The offline
 * download → notarize-in-person → upload flow remains the default and the
 * fallback. This module can only ever ATTACH real evidence; it cannot assert
 * notarization on its own.
 *
 * ── Turning it on (later, once counsel signs off) ───────────────────────────
 * Set RON_ENABLED=true AND configure a provider (RON_PROVIDER + its API key),
 * exactly like STRIPE_ENABLED. Both must be present — a flag with no configured,
 * counsel-approved provider resolves to "pending", never "live".
 */

export type RonStatus =
  | "disabled" //         off; offline notarization only (the default)
  | "pending_legal" //    a provider is configured but not yet confirmed valid in NY
  | "live" //             counsel-approved provider, wired and validated

/**
 * A provider is only "live" when the operator has BOTH flipped the flag AND
 * recorded that counsel confirmed this provider for these documents. The second
 * half is deliberately explicit (RON_PROVIDER_NY_CONFIRMED) so nobody can turn
 * real notarization on by setting an API key alone.
 */
export function ronStatus(): RonStatus {
  const flagged = process.env.RON_ENABLED === "true"
  const providerConfigured = Boolean(process.env.RON_PROVIDER && process.env.RON_PROVIDER_API_KEY)
  const nyConfirmedByCounsel = process.env.RON_PROVIDER_NY_CONFIRMED === "true"

  if (!flagged || !providerConfigured) return "disabled"
  if (!nyConfirmedByCounsel) return "pending_legal"
  return "live"
}

export function isRonLive(): boolean {
  return ronStatus() === "live"
}

/** Provider-issued proof of a completed notarization. Stored, never faked. */
export interface RonEvidence {
  provider: string
  /** The provider's session / notarization identifier. */
  sessionId: string
  /** Notary commission info the provider attests to. */
  notaryName?: string
  notaryCommission?: string
  completedAt: string
  /** URL/reference to the sealed document the provider returns. */
  sealedDocumentRef?: string
}

/** The seam a real provider adapter implements, once one is confirmed. */
export interface RonProvider {
  name: string
  /** Begin a notarization session for a prepared document; returns a redirect. */
  startSession(input: { documentRef: string; signerName: string; signerEmail: string }): Promise<{ redirectUrl: string; sessionId: string }>
  /** Fetch the sealed result once the signer completes it. */
  fetchResult(sessionId: string): Promise<RonEvidence | null>
}

/**
 * There is no live provider adapter in the tree yet — by design. When counsel
 * confirms one, add its adapter and return it here behind isRonLive().
 */
export function getRonProvider(): RonProvider | null {
  return null
}

/** Plain-language explanation for any surface that has to say why RON is off. */
export function ronUnavailableReason(): string {
  switch (ronStatus()) {
    case "pending_legal":
      return "Online notarization is configured but is awaiting attorney confirmation that it's valid in New York for these documents. For now, use the download-and-notarize path."
    case "live":
      return ""
    default:
      return "Online notarization isn't available yet. Download the document, have it notarized in person, and upload the notarized copy — that path is always available."
  }
}
