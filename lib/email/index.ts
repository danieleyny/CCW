import "server-only"

import { Resend } from "resend"
import { BRANDS, type BrandKey } from "@/config/brands"
import { renderEmail } from "./template"

/** Email is live only when a Resend key is configured; otherwise we no-op + log. */
export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

export interface EmailAttachment {
  filename: string
  /** UTF-8 string content (e.g. an .ics body) — base64-encoded before sending. */
  content: string
  contentType?: string
}

export interface SendEmailInput {
  brand: BrandKey
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

/** SEC-18 — mask an email for logs: keep the first char + domain, drop the rest. */
function maskEmail(addr: string): string {
  const at = addr.indexOf("@")
  if (at <= 0) return "***"
  return `${addr[0]}***${addr.slice(at)}`
}

export async function sendEmail(input: SendEmailInput) {
  const brand = BRANDS[input.brand]
  if (!EMAIL_ENABLED) {
    console.log(
      `[email:noop] to=${maskEmail(input.to)} subject="${input.subject}"` +
        (input.attachments?.length ? ` +${input.attachments.length} attachment(s)` : "") +
        " (set RESEND_API_KEY to enable)"
    )
    return { skipped: true as const }
  }
  // Firearm License NYC intentionally shares the existing verified sender until
  // its own sending domain is configured. Reply-to remains brand-configured.
  const from =
    process.env[brand.email.fromEnv] ||
    (input.brand === "fl" ? process.env.EMAIL_FROM : undefined) ||
    `${brand.name} <onboarding@resend.dev>`
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    replyTo: input.replyTo ?? brand.email.replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "utf-8").toString("base64"),
      contentType: a.contentType,
    })),
  })
  if (error) {
    console.error("[email] send failed:", error)
    return { skipped: false as const, error }
  }
  return { skipped: false as const, id: data?.id }
}

/** Convenience: notify a client about a case status change, branded (no-op until keys). */
export async function notifyClient(opts: {
  brand: BrandKey
  to: string | null | undefined
  subject: string
  body: string
  /** Optional action button (e.g. a one-click "remind this reference" link). */
  cta?: { label: string; url: string }
}) {
  if (!opts.to) return { skipped: true as const }
  const { html, text } = renderEmail({
    brand: opts.brand,
    heading: opts.subject,
    paragraphs: [opts.body],
    cta: opts.cta,
  })
  return sendEmail({ brand: opts.brand, to: opts.to, subject: opts.subject, html, text })
}
