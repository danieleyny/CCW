"use server"

import { headers } from "next/headers"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { notifyFormspree } from "@/lib/formspree"
import { honeypotTripped } from "@/lib/honeypot"
import { sendEmail } from "@/lib/email"
import { renderEmail } from "@/lib/email/template"
import { brand } from "@/config/brand"
import { partnerBySlug, partnerFullName } from "@/config/partners"
import {
  consultationSchema,
  toFieldErrors,
  type ConsultState,
} from "@/lib/partners/consultation"

/**
 * Attorney-consultation request. A legal enquiry is NOT a sales lead: this creates no
 * client, case, task or appointment row and never touches the case pipeline. It only
 * NOTIFIES the business inbox so the attorney can be briefed — over TWO independent
 * channels (Resend + Formspree), because either alone can silently drop a message: a
 * Formspree spam-flag stores the submission but never emails it, and Resend depends on
 * a configured key. Sending both means one path failing doesn't lose the request.
 * Honeypot + per-IP rate limit + zod boundary mirror captureLead's defenses — but
 * deliberately none of its row-creating side effects.
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

  // Notify — no row is written anywhere. Two channels for reliability (see the doc
  // comment): Formspree, plus a branded Resend email that replies straight to the person.
  const represented = v.represented === "yes" ? "Yes" : "No"

  await notifyFormspree("attorney_consultation", {
    attorney: partnerFullName(partner),
    name: v.name,
    email: v.email,
    phone: v.phone,
    best_times: v.bestTimes,
    question_about: v.topic,
    where_in_process: v.stage,
    target_date: v.targetDate,
    what_to_discuss: v.discuss,
    currently_represented: represented,
    acknowledged_not_privileged: "Yes",
  })

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
      "An attorney consultation request from the Gun License NYC site. This is a referral enquiry, not a case — no client or case record was created.",
  })
  await sendEmail({
    to: brand.contact.email,
    subject: `Attorney consultation request: ${v.name}`,
    html,
    text,
    // Reply goes straight to the person who asked.
    replyTo: v.email,
  })

  return { ok: true }
}
