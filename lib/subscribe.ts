import crypto from "node:crypto"
import { renderEmail } from "@/lib/email/template"

/**
 * V5b Workstream A — shared subscribe helpers. No `server-only` so the verify
 * harness can import the token functions.
 */
export const SUBSCRIBE_OFFERS = ["fit-report", "reciprocity-card", "law-watch", "checklist"] as const
export type SubscribeOffer = (typeof SUBSCRIBE_OFFERS)[number]

// One HMAC secret. Unsubscribe links only go out with email enabled (RESEND key
// set), so a missing secret can't leak a live link; set SUBSCRIBE_SECRET in prod.
function secret(): string {
  return process.env.SUBSCRIBE_SECRET || "carry-subscribe-dev-secret"
}

/** `<id>.<hmac>` — a one-click, no-login unsubscribe token. */
export function unsubToken(id: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(id).digest("base64url")
  return `${id}.${sig}`
}

/** Return the subscriber id if the token's HMAC is valid, else null. */
export function verifyUnsub(token: string): string | null {
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null
  const id = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac("sha256", secret()).update(id).digest("base64url")
  // constant-time compare
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return crypto.timingSafeEqual(a, b) ? id : null
}

/** Comma-separated allowlist of origins permitted to POST cross-origin. */
export function allowedOrigins(): string[] {
  return (process.env.SUBSCRIBE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

const OFFER_COPY: Record<SubscribeOffer, { subject: string; line: string }> = {
  "fit-report": { subject: "Your Gun License NYC fit report", line: "Here's the report you requested." },
  "reciprocity-card": { subject: "Your reciprocity card", line: "Here's your reciprocity summary." },
  "law-watch": {
    subject: "You're on Law Watch",
    line: "We'll email you when a NYC carry requirement actually changes — the authority, what changed, and where to read it. Nothing else.",
  },
  checklist: { subject: "Your NYC carry checklist", line: "Here's your personalized document checklist." },
}

export function offerSubject(offer: SubscribeOffer): string {
  return OFFER_COPY[offer].subject
}

export function offerEmail(offer: SubscribeOffer, unsubUrl: string): { html: string; text: string } {
  const { subject, line } = OFFER_COPY[offer]
  return renderEmail({
    preheader: line,
    heading: subject,
    paragraphs: [line],
    recipientReason: "You received this because you requested it from Gun License NYC.",
    unsubscribeUrl: unsubUrl,
  })
}
