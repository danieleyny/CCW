import "server-only"

import { Resend } from "resend"
import { brand } from "@/config/brand"

/** Email is live only when a Resend key is configured; otherwise we no-op + log. */
export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? `${brand.name} <onboarding@resend.dev>`

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

/** Convenience: notify a client about a case status change (stubbed until keys). */
export async function notifyClient(opts: {
  to: string | null | undefined
  subject: string
  body: string
}) {
  if (!opts.to) return { skipped: true as const }
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <p>${opts.body}</p>
      <p style="color:#666;font-size:12px">— ${brand.name}</p>
    </div>`,
    text: opts.body,
  })
}
