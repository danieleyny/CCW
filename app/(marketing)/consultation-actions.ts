"use server"

import { headers } from "next/headers"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { honeypotTripped } from "@/lib/honeypot"
import { sendEmail } from "@/lib/email"
import { renderEmail } from "@/lib/email/template"
import { partnerBySlug, partnerFullName } from "@/config/partners"
import {
  consultationSchema,
  toFieldErrors,
  type ConsultState,
} from "@/lib/partners/consultation"

/**
 * Attorney-consultation request. A legal enquiry is NOT a sales lead: this creates no
 * client, case, task or appointment row and never touches the case pipeline.
 *
 * PRIVILEGE (Q9) — the request goes DIRECTLY to the attorney and NOWHERE else. Gun
 * License NYC must not receive or keep a copy: routing it to us could destroy privilege.
 * So there is exactly one recipient — the partner's own email — no Formspree, no
 * brand-inbox cc/bcc. And it FAILS CLOSED: if the send is skipped or errors we tell the
 * person to contact his office directly rather than falsely reporting success. Nothing
 * logs the body, and the subject carries no name so even the noop log line has no PII.
 * Honeypot + per-IP rate limit + zod boundary remain; still no row-creating side effects.
 */
export async function requestConsultation(
  _prev: ConsultState,
  formData: FormData
): Promise<ConsultState> {
  // Honeypot: humans never see it. Pretend success so bots don't learn.
  if (honeypotTripped(formData)) return { ok: true }

  // Per-IP brake on this unauthenticated endpoint (6th submission in a minute fails).
  const ip = clientIpFrom(await headers())
  if (!rateLimit(`consult:${ip}`, 5)) {
    return { error: "Too many requests — please wait a minute and try again." }
  }

  const parsed = consultationSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    bestTimes: formData.get("bestTimes") ?? "",
    topic: formData.get("topic") ?? "",
    stage: formData.get("stage") ?? "",
    targetDate: formData.get("targetDate") ?? "",
    discuss: formData.get("discuss") ?? "",
    represented: formData.get("represented") ?? "",
    acknowledge: formData.get("acknowledge") ?? "",
    partnerSlug: formData.get("partnerSlug") ?? "",
  })
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) }
  }
  const v = parsed.data

  // The form is gated, but validate the target attorney server-side too: a hidden or
  // unknown partner accepts no request.
  const partner = partnerBySlug(v.partnerSlug)
  if (!partner) {
    return { error: "This attorney is not available for consultation requests right now." }
  }

  // Notify the attorney ONLY — no row anywhere, no copy to us (privilege, Q9).
  const represented = v.represented === "yes" ? "Yes" : "No"

  const { html, text } = renderEmail({
    eyebrow: "Attorney consultation request",
    heading: v.name,
    paragraphs: [
      `For: ${partnerFullName(partner)}`,
      `${v.email} · ${v.phone}`,
      ...(v.bestTimes ? [`Best times to reach them: ${v.bestTimes}`] : []),
      `About: ${v.topic}`,
      `Where in the process: ${v.stage}`,
      ...(v.targetDate ? [`Working toward: ${v.targetDate}`] : []),
      `Currently represented by another attorney: ${represented}`,
      "—",
      "What they'd like to discuss:",
      v.discuss,
    ],
    recipientReason:
      "A consultation request submitted through the Gun License NYC site and sent directly to you. Gun License NYC does not receive or keep a copy.",
  })
  const result = await sendEmail({
    // The ONE recipient — the attorney's own inbox. No brand cc/bcc.
    to: partner.email,
    // No person's name in the subject — even the [email:noop] log line stays PII-free.
    subject: "Consultation request via Gun License NYC",
    html,
    text,
    // Reply goes straight to the person who asked.
    replyTo: v.email,
  })
  // FAIL CLOSED: if we couldn't actually send it, never claim success — the request
  // would otherwise vanish silently, and we keep no copy to recover it.
  if (result.skipped || result.error) {
    return {
      error: `We couldn't send your request. Please email his office directly at ${partner.email} or call ${partner.phone}.`,
    }
  }

  return { ok: true }
}
