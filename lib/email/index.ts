import "server-only"

import { Resend } from "resend"
import { brand } from "@/config/brand"
import { renderEmail } from "./template"

/** Email is live only when a Resend key is configured; otherwise we no-op + log. */
export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? `${brand.name} <onboarding@resend.dev>`
// Replies to any transactional email reach a human at the brand contact inbox.
const REPLY_TO = brand.contact.email

export interface EmailAttachment {
  filename: string
  /** UTF-8 string content (e.g. an .ics body) — base64-encoded before sending. */
  content: string
  contentType?: string
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(input: SendEmailInput) {
  if (!EMAIL_ENABLED) {
    console.log(
      `[email:noop] to=${input.to} subject="${input.subject}"` +
        (input.attachments?.length ? ` +${input.attachments.length} attachment(s)` : "") +
        " (set RESEND_API_KEY to enable)"
    )
    return { skipped: true as const }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    replyTo: input.replyTo ?? REPLY_TO,
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
  to: string | null | undefined
  subject: string
  body: string
  /** Optional action button (e.g. a one-click "remind this reference" link). */
  cta?: { label: string; url: string }
}) {
  if (!opts.to) return { skipped: true as const }
  const { html, text } = renderEmail({ heading: opts.subject, paragraphs: [opts.body], cta: opts.cta })
  return sendEmail({ to: opts.to, subject: opts.subject, html, text })
}
