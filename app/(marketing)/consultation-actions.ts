"use server"

import { headers } from "next/headers"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { notifyFormspree } from "@/lib/formspree"
import { partnerBySlug, partnerFullName } from "@/config/partners"
import {
  consultationSchema,
  toFieldErrors,
  type ConsultState,
} from "@/lib/partners/consultation"

/**
 * Attorney-consultation request. A legal enquiry is NOT a sales lead: this creates no
 * client, case, task or appointment row and never touches the case pipeline. It only
 * emails the request to the business inbox (Formspree, no API key) so the attorney can
 * be briefed. Honeypot + per-IP rate limit + zod boundary, mirroring captureLead's
 * defenses — but deliberately none of its row-creating side effects.
 */
export async function requestConsultation(
  _prev: ConsultState,
  formData: FormData
): Promise<ConsultState> {
  // Honeypot: humans never see "company". Pretend success so bots don't learn.
  if (String(formData.get("company") ?? "").trim() !== "") return { ok: true }

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

  // Formspree notification ONLY — no row is written anywhere.
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
    currently_represented: v.represented === "yes" ? "Yes" : "No",
    acknowledged_not_privileged: "Yes",
  })

  return { ok: true }
}
